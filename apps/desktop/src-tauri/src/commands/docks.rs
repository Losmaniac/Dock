//! Extra dock windows. The first dock lives in the `main` window (created from tauri.conf.json);
//! every further dock gets a `dock-<id>` window that loads the same UI with `?dock=<id>`.
use std::collections::HashSet;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
};

use crate::commands::shell::{self, BlurMode};
use dock_core::validate::valid_dock_id;
use crate::error::{DockError, DockResult};
use crate::visibility;

const PREFIX: &str = "dock-";

/// Shared by the main window and every extra dock window: blur, no focus stealing, no Alt+Tab entry.
pub fn prepare_window(window: &WebviewWindow) -> DockResult<()> {
    if let Err(e) = shell::apply_blur(window, BlurMode::Mica) {
        eprintln!("native blur unavailable: {e}");
    }
    shell::set_dock_focusable(window.clone(), false)?;
    let hwnd = HWND(window.hwnd()?.0 as *mut std::ffi::c_void);
    // SAFETY: style update on our own window.
    unsafe {
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        SetWindowLongW(hwnd, GWL_EXSTYLE, (ex | WS_EX_TOOLWINDOW.0) as i32);
    }
    Ok(())
}

fn create(app: &AppHandle, id: &str) -> DockResult<()> {
    let label = format!("{PREFIX}{id}");
    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(format!("index.html?dock={id}").into()))
        .title("Glass Dock")
        .inner_size(720.0, 140.0)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible(false) // revealed after its first placement, like the main window
        .build()?;
    prepare_window(&window)
}

/// Make the set of `dock-*` windows equal `ids`. Runs on the async pool because creating
/// windows from a synchronous command can deadlock on Windows.
#[tauri::command(async)]
pub fn sync_dock_windows(app: AppHandle, dock_ids: Vec<String>) -> DockResult<()> {
    if let Some(bad) = dock_ids.iter().find(|id| !valid_dock_id(id)) {
        return Err(DockError::InvalidArgument(format!("invalid dock id: {bad}")));
    }
    let wanted: HashSet<String> = dock_ids.iter().map(|id| format!("{PREFIX}{id}")).collect();
    let existing: HashSet<String> = app
        .webview_windows()
        .into_keys()
        .filter(|l| l.starts_with(PREFIX))
        .collect();
    for label in existing.difference(&wanted) {
        if let Some(w) = app.get_webview_window(label) {
            visibility::forget(label);
            let _ = w.destroy();
        }
    }
    for label in wanted.difference(&existing) {
        create(&app, label.trim_start_matches(PREFIX))?;
    }
    Ok(())
}
