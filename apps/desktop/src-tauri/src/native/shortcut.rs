//! Resolve `.lnk` shortcuts to their target so drag-to-pin matches running windows.
use serde::Serialize;
use windows::core::{Interface, HSTRING, PCWSTR};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, IPersistFile, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    STGM_READ,
};
use windows::Win32::UI::Shell::{IShellLinkW, ShellLink, SLR_NO_UI};

use crate::error::DockResult;

#[derive(Debug, Serialize)]
pub struct Resolved {
    pub target: String,
    pub args: Vec<String>,
}

pub fn resolve(path: &str) -> DockResult<Resolved> {
    // SAFETY: COM calls on interfaces created here; buffers are sized as passed.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
        let file: IPersistFile = link.cast()?;
        file.Load(PCWSTR(HSTRING::from(path).as_ptr()), STGM_READ)?;
        let _ = link.Resolve(windows::Win32::Foundation::HWND::default(), SLR_NO_UI.0 as u32);
        let mut buf = [0u16; 1024];
        link.GetPath(&mut buf, std::ptr::null_mut(), 0)?;
        let target = String::from_utf16_lossy(&buf[..buf.iter().position(|&c| c == 0).unwrap_or(buf.len())]);
        let mut abuf = [0u16; 1024];
        link.GetArguments(&mut abuf)?;
        let a = String::from_utf16_lossy(&abuf[..abuf.iter().position(|&c| c == 0).unwrap_or(abuf.len())]);
        Ok(Resolved { target, args: split_args(&a) })
    }
}

/// Minimal Windows-style split: whitespace separated, double quotes group.
fn split_args(s: &str) -> Vec<String> {
    let (mut out, mut cur, mut q) = (Vec::new(), String::new(), false);
    for ch in s.chars() {
        match ch {
            '"' => q = !q,
            c if c.is_whitespace() && !q => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            c => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}
