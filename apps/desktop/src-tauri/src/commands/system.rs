use tauri::AppHandle;

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
