use dock_core::layout::{Fractions, SnapLayout};
use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlacementDto {
    pub monitor_id: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub maximized: bool,
}

/// Saved-workspace support: where a window currently sits (fractions of the monitor work area).
#[tauri::command(async)]
pub fn capture_placement(hwnd: String) -> DockResult<Option<PlacementDto>> {
    let h = wl::to_hwnd(&hwnd)?;
    Ok(winctl::capture(h).map(|p| PlacementDto {
        monitor_id: p.monitor_id,
        x: p.fractions.x,
        y: p.fractions.y,
        w: p.fractions.w,
        h: p.fractions.h,
        maximized: p.maximized,
    }))
}

#[tauri::command(async)]
pub fn place_window(hwnd: String, placement: PlacementDto) -> DockResult<()> {
    let h = wl::to_hwnd(&hwnd)?;
    wl::ensure_controllable(h)?;
    let f = Fractions { x: placement.x, y: placement.y, w: placement.w, h: placement.h };
    winctl::place(h, &placement.monitor_id, f, placement.maximized)
}
