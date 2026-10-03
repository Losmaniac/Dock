//! Icon extraction at 256 px via IShellItemImageFactory, cached on disk (AGENTS.md 5.1).
//! Works for files, shortcuts and Store apps (`shell:AppsFolder\<AUMID>`).
use std::ffi::c_void;
use std::fs;
use std::time::UNIX_EPOCH;

use windows::core::HSTRING;
use windows::Win32::Foundation::SIZE;
use windows::Win32::Graphics::Gdi::{
    DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC, BITMAP, BITMAPINFO, BITMAPINFOHEADER,
    BI_RGB, DIB_RGB_COLORS, HBITMAP,
};
use windows::Win32::UI::Shell::{
    IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_BIGGERSIZEOK, SIIGBF_ICONONLY,
};

use crate::config;
use crate::error::{DockError, DockResult};
use dock_core::iconkey;

const SIZE_PX: i32 = 256;

pub fn icon_data_url(source: &str, is_aumid: bool) -> DockResult<String> {
    let parse_name = if is_aumid {
        format!("shell:AppsFolder\\{source}")
    } else {
        source.to_string()
    };
    // Exe icons change when the file changes; AUMIDs have no mtime (0 = never invalidated).
    let mtime = if is_aumid {
        0
    } else {
        fs::metadata(source)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .ok_or_else(|| DockError::InvalidArgument(format!("path not found: {source}")))?
    };
    let dir = config::cache_dir("icons")?;
    let name = iconkey::cache_file_name(source, mtime, SIZE_PX as u32);
    let file = dir.join(&name);

    let png = match fs::read(&file) {
        Ok(bytes) => bytes,
        Err(_) => {
            let png = extract_png(&parse_name)?;
            fs::write(&file, &png)?;
            if let Ok(rd) = fs::read_dir(&dir) {
                for e in rd.flatten() {
                    let n = e.file_name().to_string_lossy().to_string();
                    if iconkey::is_stale_sibling(&n, source, &name) {
                        let _ = fs::remove_file(e.path());
                    }
                }
            }
            png
        }
    };
    Ok(format!("data:image/png;base64,{}", dock_core::b64::encode(&png)))
}

fn extract_png(parse_name: &str) -> DockResult<Vec<u8>> {
    // SAFETY: COM is initialized by Tauri/WebView2 on the main thread; for worker threads
    // `ensure_com` below initializes it. The HBITMAP is deleted on every path.
    unsafe {
        ensure_com();
        let factory: IShellItemImageFactory =
            SHCreateItemFromParsingName(&HSTRING::from(parse_name), None)?;
        let hbmp = factory.GetImage(
            SIZE { cx: SIZE_PX, cy: SIZE_PX },
            SIIGBF_ICONONLY | SIIGBF_BIGGERSIZEOK,
        )?;
        let res = bitmap_to_png(hbmp);
        let _ = DeleteObject(hbmp.into());
        res
    }
}

fn ensure_com() {
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
    // SAFETY: repeated calls return S_FALSE / RPC_E_CHANGED_MODE, both harmless here.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }
}

/// SAFETY: `hbmp` must be a valid 32-bit bitmap (GetImage returns premultiplied BGRA).
unsafe fn bitmap_to_png(hbmp: HBITMAP) -> DockResult<Vec<u8>> {
    let mut bm = BITMAP::default();
    if GetObjectW(hbmp.into(), std::mem::size_of::<BITMAP>() as i32, Some(&mut bm as *mut _ as *mut c_void)) == 0 {
        return Err(DockError::OsError("GetObject failed".into()));
    }
    let (w, h) = (bm.bmWidth, bm.bmHeight);
    let mut info = BITMAPINFO::default();
    info.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: w,
        biHeight: -h, // top-down
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    let mut px = vec![0u8; (w * h * 4) as usize];
    let dc = GetDC(None);
    let lines = GetDIBits(dc, hbmp, 0, h as u32, Some(px.as_mut_ptr() as *mut c_void), &mut info, DIB_RGB_COLORS);
    ReleaseDC(None, dc);
    if lines == 0 {
        return Err(DockError::OsError("GetDIBits failed".into()));
    }
    unpremultiply_bgra_to_rgba(&mut px);
    let mut out = Vec::new();
    let mut enc = png::Encoder::new(&mut out, w as u32, h as u32);
    enc.set_color(png::ColorType::Rgba);
    enc.set_depth(png::BitDepth::Eight);
    enc.write_header()
        .and_then(|mut wr| wr.write_image_data(&px))
        .map_err(|e| DockError::OsError(e.to_string()))?;
    Ok(out)
}

fn unpremultiply_bgra_to_rgba(px: &mut [u8]) {
    for p in px.chunks_exact_mut(4) {
        let a = p[3] as u32;
        let (b, g, r) = (p[0] as u32, p[1] as u32, p[2] as u32);
        let un = |c: u32| if a == 0 { 0 } else { ((c * 255 + a / 2) / a).min(255) as u8 };
        p[0] = un(r);
        p[1] = un(g);
        p[2] = un(b);
    }
}
