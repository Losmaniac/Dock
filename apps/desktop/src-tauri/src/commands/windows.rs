use crate::error::DockResult;
use crate::native::windows_list::{self as wl, WindowInfo};

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
