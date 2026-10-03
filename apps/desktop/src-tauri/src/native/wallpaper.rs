use windows::Win32::UI::WindowsAndMessaging::{
    SystemParametersInfoW, SPI_GETDESKWALLPAPER, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
};

use crate::error::DockResult;

const MAX_BYTES: u64 = 25 * 1024 * 1024;

/// Current wallpaper as a data URL. `None` for a solid colour, a slideshow in transition, a
/// file that is not an image, or a file larger than 25 MB.
pub fn current() -> DockResult<Option<String>> {
    let mut buf = [0u16; 520];
    // SAFETY: the buffer length passed matches the buffer; the API writes a NUL-terminated path.
    unsafe {
        if SystemParametersInfoW(
            SPI_GETDESKWALLPAPER,
            buf.len() as u32,
            Some(buf.as_mut_ptr() as *mut _),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        )
        .is_err()
        {
            return Ok(None);
        }
    }
    let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    let path = String::from_utf16_lossy(&buf[..end]);
    if path.is_empty() {
        return Ok(None);
    }
    let meta = match std::fs::metadata(&path) {
        Ok(m) if m.is_file() && m.len() <= MAX_BYTES => m,
        _ => return Ok(None),
    };
    let _ = meta;
    let bytes = std::fs::read(&path)?;
    Ok(dock_core::validate::sniff_image_mime(&bytes)
        .map(|mime| format!("data:{mime};base64,{}", dock_core::b64::encode(&bytes))))
}
