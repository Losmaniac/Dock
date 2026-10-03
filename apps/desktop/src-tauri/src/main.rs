// Hide the console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::shell::set_blur_mode])
        .setup(|app| {
            // The window is created hidden (tauri.conf.json). Apply native blur first,
            // position it, and only then show it, to avoid a white flash at startup.
            let window = app
                .get_webview_window("main")
                .ok_or("main window missing")?;

            #[cfg(windows)]
            {
                use commands::shell::{apply_blur, BlurMode};
                if let Err(e) = apply_blur(&window, BlurMode::Mica) {
                    eprintln!("native blur unavailable: {e}");
                }
            }

            if let Some(monitor) = window.primary_monitor()? {
                let area = monitor.size();
                let origin = monitor.position();
                let win = window.outer_size()?;
                let x = origin.x + (area.width as i32 - win.width as i32) / 2;
                let y = origin.y + area.height as i32 - win.height as i32 - 8;
                window.set_position(tauri::PhysicalPosition::new(x, y))?;
            }
            window.show()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glass Dock");
}
