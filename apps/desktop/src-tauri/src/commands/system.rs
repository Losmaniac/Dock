use tauri::{AppHandle, WebviewWindow};
use windows::Win32::Foundation::HWND;
use tauri_plugin_autostart::ManagerExt;

use dock_core::layout::Rect;
use crate::native::{audio, thumbs};
use crate::native::windows_list::to_hwnd;

use crate::error::DockResult;
use crate::native::media::{self, MediaInfo};
use crate::native::system::{self, Battery, SystemStats};

#[tauri::command(async)]
pub fn get_system_stats() -> SystemStats {
    system::stats()
}

#[tauri::command(async)]
pub fn get_battery() -> Option<Battery> {
    system::battery()
}

#[tauri::command(async)]
pub fn get_now_playing() -> DockResult<Option<MediaInfo>> {
    media::now_playing()
}

#[tauri::command(async)]
pub fn media_control(action: String) -> DockResult<()> {
    media::control(&action)
}

#[tauri::command]
pub fn register_hotkey(app: AppHandle, accelerator: String, action_id: String) -> DockResult<()> {
    crate::hotkeys::register(&app, &accelerator, &action_id)
}

#[tauri::command(async)]
pub fn get_audio() -> DockResult<audio::AudioState> {
    audio::state()
}

#[tauri::command(async)]
pub fn set_volume(volume: f32) -> DockResult<()> {
    audio::set_volume(volume)
}

#[tauri::command(async)]
pub fn set_muted(input: bool, muted: bool) -> DockResult<()> {
    audio::set_muted(input, muted)
}

#[derive(serde::Deserialize)]
pub struct ThumbRect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

/// `rect` is in physical pixels relative to the dock window.
#[tauri::command]
pub fn show_thumbnail(window: WebviewWindow, hwnd: String, rect: ThumbRect) -> DockResult<()> {
    let dock = HWND(window.hwnd()?.0 as *mut std::ffi::c_void);
    thumbs::show(dock, to_hwnd(&hwnd)?, Rect::new(rect.x, rect.y, rect.w, rect.h))
}

#[tauri::command]
pub fn hide_thumbnails() {
    thumbs::hide_all();
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> DockResult<bool> {
    app.autolaunch().is_enabled().map_err(|e| crate::error::DockError::OsError(e.to_string()))
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, on: bool) -> DockResult<()> {
    let al = app.autolaunch();
    let r = if on { al.enable() } else { al.disable() };
    r.map_err(|e| crate::error::DockError::OsError(e.to_string()))
}
