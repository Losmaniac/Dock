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
    // Guard mode: no UI at all, just wait for the dock to end and restore the taskbar.
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--taskbar-guard") {
        let pid = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
        let prev = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(0);
        native::taskbar::run_guard(pid, prev);
        return;
    }
    native::taskbar::recover_after_crash();
    // A panic must never leave the taskbar hidden.
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        native::taskbar::restore();
        default_hook(info);
    }));
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A second launch just brings the existing dock back.
            visibility::show_for_user(app);
        }))
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::shell::set_blur_mode,
            commands::shell::set_dock_geometry,
            commands::shell::set_dock_focusable,
            commands::docks::sync_dock_windows,
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
            commands::system::fetch_text,
            commands::system::set_taskbar_hidden,
            commands::system::get_wallpaper,
            commands::system::get_disks,
            commands::system::get_uptime,
            commands::system::get_temperatures,
            commands::system::get_network,
            commands::system::get_virtual_desktops,
            commands::system::switch_virtual_desktop,
            commands::system::get_media_cover,
            commands::system::get_audio,
            commands::system::set_volume,
            commands::system::set_muted,
            commands::system::show_thumbnail,
            commands::system::hide_thumbnails,
            commands::system::get_autostart,
            commands::system::set_autostart,
            commands::windows::capture_placement,
            commands::windows::place_window,
            config::export_config,
            commands::launcher::launch,
            commands::launcher::get_icon,
            commands::launcher::describe_path,
            commands::launcher::list_folder,
            commands::launcher::get_start_apps,
            commands::launcher::get_recent_files,
            commands::launcher::search_documents,
            config::load_config,
            config::save_config,
            config::backup_corrupt_config,
        ])
        .setup(|app| {
            // The main window is created hidden (tauri.conf.json). Style it and apply native blur
            // first; it is revealed after the frontend's first placement to avoid a white flash.
            let window = app.get_webview_window("main").ok_or("main window missing")?;
            commands::docks::prepare_window(&window)?;
            events::start(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Glass Dock")
        .run(|app, event| {
            // Always restore system state on exit (AGENTS.md pitfall 9).
            if let tauri::RunEvent::Exit = event {
                let _ = app; // windows are already gone; the process-wide registries do the cleanup
                native::taskbar::restore();
                native::appbar::release_all();
            }
        });
}
