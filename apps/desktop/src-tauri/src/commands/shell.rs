use dock_core::layout::{dock_rect, DockMode, Position};
use serde::Deserialize;
use tauri::{Manager, WebviewWindow};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE};

use crate::native::{appbar, monitors};

use crate::error::DockResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlurMode {
    Mica,
    Acrylic,
    Blur,
    None,
}

/// Fallback order when a mode is unavailable on this Windows build.
/// Pure logic, unit-tested: Mica (Win11) -> Acrylic -> Blur -> none.
pub fn fallback_chain(requested: BlurMode) -> &'static [BlurMode] {
    match requested {
        BlurMode::Mica => &[BlurMode::Mica, BlurMode::Acrylic, BlurMode::Blur],
        BlurMode::Acrylic => &[BlurMode::Acrylic, BlurMode::Blur],
        BlurMode::Blur => &[BlurMode::Blur],
        BlurMode::None => &[],
    }
}

/// Applies native blur behind the (transparent) window. Returns the mode that took effect.
pub fn apply_blur(window: &WebviewWindow, requested: BlurMode) -> DockResult<Option<BlurMode>> {
    use window_vibrancy::{
        apply_acrylic, apply_blur as vibrancy_blur, apply_mica, clear_acrylic, clear_blur,
        clear_mica,
    };
    // Clear all first so switching modes never stacks effects. Errors are expected when
    // the effect was not applied, so they are intentionally ignored.
    let _ = clear_mica(window);
    let _ = clear_acrylic(window);
    let _ = clear_blur(window);

    for mode in fallback_chain(requested) {
        let ok = match mode {
            BlurMode::Mica => apply_mica(window, None).is_ok(),
            BlurMode::Acrylic => apply_acrylic(window, Some((18, 18, 18, 80))).is_ok(),
            BlurMode::Blur => vibrancy_blur(window, Some((18, 18, 18, 80))).is_ok(),
            BlurMode::None => true,
        };
        if ok {
            return Ok(Some(*mode));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn set_blur_mode(window: WebviewWindow, mode: BlurMode) -> DockResult<()> {
    apply_blur(&window, mode).map(|_| ())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Geometry {
    pub position: Position,
    pub mode: DockMode,
    /// Logical (CSS) pixels measured by the frontend.
    pub length: f64,
    pub thickness: f64,
    /// Gap to the screen edge (logical px); 0 for auto-hide so the pointer can reach the bar.
    pub margin: f64,
    /// `"primary"` or a monitor id from `get_monitors`; unknown ids fall back to primary.
    pub monitor: String,
    /// Logical px to reserve as an AppBar (0 = do not reserve).
    pub reserve: f64,
}

fn hwnd_of(window: &WebviewWindow) -> DockResult<HWND> {
    Ok(HWND(window.hwnd()?.0 as *mut std::ffi::c_void))
}

/// Single atomic SetWindowPos so the dock never visibly jumps between size and position.
#[tauri::command]
pub fn set_dock_geometry(window: WebviewWindow, geometry: Geometry) -> DockResult<()> {
    let mon = if geometry.monitor == "primary" {
        monitors::primary()
    } else {
        monitors::resolve(&geometry.monitor).unwrap_or_else(monitors::primary)
    };
    let hwnd = hwnd_of(&window)?;
    let px = |v: f64| (v * mon.scale).round() as i32;

    // With a reserved AppBar the work area already excludes the bar, so place against the
    // full monitor instead; otherwise keep clear of the taskbar via the work area.
    let reserving = geometry.reserve > 0.0 && geometry.mode != DockMode::Hidden;
    if reserving {
        appbar::reserve(hwnd, mon.full, geometry.position, px(geometry.reserve));
    } else {
        appbar::release(hwnd);
    }
    let area = if reserving { mon.full } else { mon.work };
    let r = dock_rect(area, geometry.position, px(geometry.length), px(geometry.thickness), px(geometry.margin), geometry.mode);
    // SAFETY: hwnd belongs to this process's live main window.
    unsafe {
        SetWindowPos(hwnd, Some(HWND_TOPMOST), r.x, r.y, r.w, r.h, SWP_NOACTIVATE)?;
    }
    crate::visibility::mark_placed(window.app_handle(), window.label());
    Ok(())
}

/// The dock window must not steal focus from the app being controlled, except while a text
/// field (command palette) needs the keyboard.
#[tauri::command]
pub fn set_dock_focusable(window: WebviewWindow, focusable: bool) -> DockResult<()> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
    };
    let hwnd = hwnd_of(&window)?;
    // SAFETY: read-modify-write of this process's own window style.
    unsafe {
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let ex = if focusable { ex & !WS_EX_NOACTIVATE.0 } else { ex | WS_EX_NOACTIVATE.0 };
        SetWindowLongW(hwnd, GWL_EXSTYLE, ex as i32);
    }
    if focusable {
        let _ = window.set_focus();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mica_falls_back_through_acrylic_to_blur() {
        assert_eq!(
            fallback_chain(BlurMode::Mica),
            &[BlurMode::Mica, BlurMode::Acrylic, BlurMode::Blur]
        );
    }

    #[test]
    fn none_applies_nothing() {
        assert!(fallback_chain(BlurMode::None).is_empty());
    }

    #[test]
    fn deserializes_lowercase_names() {
        let m: BlurMode = serde_json::from_str("\"acrylic\"").unwrap();
        assert_eq!(m, BlurMode::Acrylic);
    }
}
