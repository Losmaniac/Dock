use dock_core::layout::Rect;
use serde::Serialize;
use windows::core::BOOL;
use windows::Win32::Foundation::{LPARAM, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    EnumDisplayMonitors, GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, HDC, HMONITOR,
    MONITORINFO, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY,
};
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::Foundation::HWND;

pub fn rect(r: RECT) -> Rect {
    Rect::new(r.left, r.top, r.right - r.left, r.bottom - r.top)
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Monitor {
    /// Device name such as `\\.\DISPLAY1`; stable across sessions unlike HMONITOR.
    pub id: String,
    pub primary: bool,
    #[serde(skip)]
    pub full: Rect,
    #[serde(skip)]
    pub work: Rect,
    pub width: i32,
    pub height: i32,
    pub scale: f64,
}

fn info(m: HMONITOR) -> Option<Monitor> {
    // SAFETY: MONITORINFOEXW is initialized with its size as the API requires.
    unsafe {
        let mut i = MONITORINFOEXW::default();
        i.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        if !GetMonitorInfoW(m, &mut i as *mut _ as *mut MONITORINFO).as_bool() {
            return None;
        }
        let end = i.szDevice.iter().position(|&c| c == 0).unwrap_or(i.szDevice.len());
        let (mut dx, mut dy) = (96u32, 96u32);
        let _ = GetDpiForMonitor(m, MDT_EFFECTIVE_DPI, &mut dx, &mut dy);
        let full = rect(i.monitorInfo.rcMonitor);
        Some(Monitor {
            id: String::from_utf16_lossy(&i.szDevice[..end]),
            primary: i.monitorInfo.dwFlags & 1 != 0,
            work: rect(i.monitorInfo.rcWork),
            width: full.w,
            height: full.h,
            full,
            scale: dx as f64 / 96.0,
        })
    }
}

unsafe extern "system" fn cb(m: HMONITOR, _: HDC, _: *mut RECT, lp: LPARAM) -> BOOL {
    // SAFETY: lp points at the Vec passed to EnumDisplayMonitors below.
    let out = &mut *(lp.0 as *mut Vec<Monitor>);
    if let Some(mon) = info(m) {
        out.push(mon);
    }
    BOOL(1)
}

pub fn list() -> Vec<Monitor> {
    let mut out: Vec<Monitor> = Vec::new();
    // SAFETY: the callback runs only during this call while `out` is alive.
    unsafe {
        let _ = EnumDisplayMonitors(None, None, Some(cb), LPARAM(&mut out as *mut _ as isize));
    }
    out.sort_by(|a, b| b.primary.cmp(&a.primary).then(a.id.cmp(&b.id)));
    out
}

/// The configured monitor, falling back to primary when it is unplugged.
pub fn resolve(id: &str) -> Option<Monitor> {
    let all = list();
    all.iter().find(|m| m.id == id).cloned().or_else(|| all.into_iter().next())
}

pub fn primary() -> Monitor {
    // SAFETY: plain query.
    let m = unsafe { MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY) };
    info(m).unwrap_or(Monitor {
        id: String::new(),
        primary: true,
        full: Rect::new(0, 0, 1920, 1080),
        work: Rect::new(0, 0, 1920, 1040),
        width: 1920,
        height: 1080,
        scale: 1.0,
    })
}

pub fn of_window(hwnd: HWND) -> Option<Monitor> {
    // SAFETY: plain query; a stale handle maps to the nearest monitor.
    info(unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) })
}
