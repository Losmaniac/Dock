// Hide the console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(windows))]
compile_error!("Glass Dock targets Windows only; build with a Windows toolchain.");

mod commands;
mod config;
mod error;
mod events;
mod hotkeys;
mod native;
mod visibility;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::shell::set_blur_mode,
            commands::shell::set_dock_geometry,
            commands::shell::set_dock_focusable,
            commands::windows::list_windows,
            commands::windows::focus_window,
            commands::windows::minimize_window,
            commands::windows::close_window,
            commands::windows::snap_window,
            commands::windows::move_window_to_monitor,
            commands::windows::set_always_on_top,
            commands::windows::set_window_opacity,
            commands::windows::get_monitors,
            commands::system::get_system_stats,
            commands::system::get_battery,
            commands::system::get_now_playing,
            commands::system::media_control,
            commands::system::register_hotkey,
            commands::launcher::launch,
            commands::launcher::get_icon,
            commands::launcher::describe_path,
            commands::launcher::list_folder,
            config::load_config,
            config::save_config,
            config::backup_corrupt_config,
        ])
        .setup(|app| {
            // The window is created hidden (tauri.conf.json). Apply native blur first,
            // style it, and only then show it, to avoid a white flash at startup.
            let window = app
                .get_webview_window("main")
                .ok_or("main window missing")?;

            if let Err(e) = commands::shell::apply_blur(&window, commands::shell::BlurMode::Mica) {
                eprintln!("native blur unavailable: {e}");
            }
            // Never take focus from the app being controlled; keep out of Alt+Tab.
            commands::shell::set_dock_focusable(window.clone(), false).ok();
            {
                use windows::Win32::Foundation::HWND;
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
                };
                let hwnd = HWND(window.hwnd()?.0 as *mut std::ffi::c_void);
                // SAFETY: style update on our own window.
                unsafe {
                    let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
                    SetWindowLongW(hwnd, GWL_EXSTYLE, (ex | WS_EX_TOOLWINDOW.0) as i32);
                }
            }
            events::start(app.handle().clone());
            window.show()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Glass Dock")
        .run(|app, event| {
            // Always restore system state on exit (AGENTS.md pitfall 9).
            if let tauri::RunEvent::Exit = event {
                if let Some(w) = app.get_webview_window("main") {
                    if let Ok(h) = w.hwnd() {
                        native::appbar::release(windows::Win32::Foundation::HWND(h.0 as *mut std::ffi::c_void));
                    }
                }
            }
        });
}
