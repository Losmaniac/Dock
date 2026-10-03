use dock_core::layout::SnapLayout;

use crate::error::DockResult;
use crate::native::windows_list::{self as wl, WindowInfo};
use crate::native::{monitors, winctl};

#[tauri::command(async)]
pub fn list_windows() -> Vec<WindowInfo> {
    wl::list_windows()
}

#[tauri::command(async)]
pub fn focus_window(hwnd: String) -> DockResult<()> {
    wl::focus(wl::to_hwnd(&hwnd)?)
}

#[tauri::command(async)]
pub fn minimize_window(hwnd: String) -> DockResult<()> {
    wl::minimize(wl::to_hwnd(&hwnd)?)
}

#[tauri::command(async)]
pub fn close_window(hwnd: String) -> DockResult<()> {
    wl::close(wl::to_hwnd(&hwnd)?)
}

#[tauri::command(async)]
pub fn snap_window(hwnd: String, layout: SnapLayout) -> DockResult<()> {
    let h = wl::to_hwnd(&hwnd)?;
    wl::ensure_controllable(h)?;
    winctl::snap(h, layout)
}

#[tauri::command(async)]
pub fn move_window_to_monitor(hwnd: String, monitor_id: String) -> DockResult<()> {
    let h = wl::to_hwnd(&hwnd)?;
    wl::ensure_controllable(h)?;
    winctl::move_to_monitor(h, &monitor_id)
}

#[tauri::command(async)]
pub fn set_always_on_top(hwnd: String, on: bool) -> DockResult<()> {
    let h = wl::to_hwnd(&hwnd)?;
    wl::ensure_controllable(h)?;
    winctl::set_always_on_top(h, on)
}

#[tauri::command(async)]
pub fn set_window_opacity(hwnd: String, value: f64) -> DockResult<()> {
    let h = wl::to_hwnd(&hwnd)?;
    wl::ensure_controllable(h)?;
    winctl::set_opacity(h, value)
}

#[tauri::command(async)]
pub fn get_monitors() -> Vec<monitors::Monitor> {
    monitors::list()
}
