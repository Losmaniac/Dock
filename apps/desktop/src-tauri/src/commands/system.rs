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

/// The only network call in the app. Used by the opt-in calendar and weather widgets.
/// HTTPS, public hosts only, 10 s timeout, 1 MB cap.
#[tauri::command(async)]
pub fn fetch_text(url: String) -> DockResult<String> {
    use std::io::Read;
    use std::time::Duration;
    if !dock_core::net::is_public_https_url(&url) {
        return Err(crate::error::DockError::InvalidArgument(
            "Only public https:// addresses can be fetched.".into(),
        ));
    }
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(10)))
        .max_redirects(3)
        .https_only(true)
        .build()
        .into();
    let mut resp = agent
        .get(&url)
        .call()
        .map_err(|e| crate::error::DockError::OsError(format!("request failed: {e}")))?;
    let mut body = String::new();
    resp.body_mut()
        .as_reader()
        .take(1024 * 1024)
        .read_to_string(&mut body)
        .map_err(|e| crate::error::DockError::OsError(format!("could not read response: {e}")))?;
    Ok(body)
}

#[tauri::command(async)]
pub fn get_disks() -> Vec<system::DiskInfo> {
    system::disks()
}

#[tauri::command(async)]
pub fn get_uptime() -> u64 {
    system::uptime_secs()
}

#[tauri::command(async)]
pub fn get_temperatures() -> Vec<system::Temperature> {
    system::temperatures()
}

#[derive(serde::Serialize)]
pub struct NetworkInfo {
    pub adapters: Vec<system::Adapter>,
    pub wifi: Option<crate::native::wifi::Wifi>,
}

#[tauri::command(async)]
pub fn get_network() -> NetworkInfo {
    NetworkInfo { adapters: system::adapters(), wifi: crate::native::wifi::current() }
}

#[tauri::command(async)]
pub fn get_virtual_desktops() -> crate::native::vdesk::Desktops {
    crate::native::vdesk::desktops()
}

#[tauri::command(async)]
pub fn switch_virtual_desktop(direction: String) -> DockResult<()> {
    crate::native::vdesk::switch(&direction)
}

#[tauri::command(async)]
pub fn get_media_cover() -> DockResult<Option<String>> {
    media::cover()
}
