// Hide the console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(windows))]
compile_error!("Glass Dock targets Windows only; build with a Windows toolchain.");

mod commands;
mod config;
mod error;
mod events;
mod native;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::shell::set_blur_mode,
            commands::shell::set_dock_geometry,
            commands::shell::set_dock_focusable,
            commands::windows::list_windows,
            commands::windows::focus_window,
            commands::windows::minimize_window,
            commands::windows::close_window,
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
        .run(tauri::generate_context!())
        .expect("error while running Glass Dock");
}
