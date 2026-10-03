//! The dock window is hidden when the user toggles it or a fullscreen app/game is running.
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager};

static USER_HIDDEN: AtomicBool = AtomicBool::new(false);
static FULLSCREEN: AtomicBool = AtomicBool::new(false);

fn apply(app: &AppHandle) {
    if !PLACED_ONCE.load(Ordering::SeqCst) {
        return;
    }
    if let Some(w) = app.get_webview_window("main") {
        let hide = USER_HIDDEN.load(Ordering::SeqCst) || FULLSCREEN.load(Ordering::SeqCst);
        let _ = if hide { w.hide() } else { w.show() };
    }
}

static PLACED_ONCE: AtomicBool = AtomicBool::new(false);

/// The window starts hidden (no flash). It is revealed after the first placement, and from then
/// on only the user toggle and fullscreen detection decide whether it is visible.
pub fn mark_placed(app: &AppHandle) {
    if !PLACED_ONCE.swap(true, Ordering::SeqCst) {
        apply(app);
    }
}

pub fn toggle_user(app: &AppHandle) {
    USER_HIDDEN.fetch_xor(true, Ordering::SeqCst);
    apply(app);
}

/// Returns true when the state changed.
pub fn set_fullscreen(app: &AppHandle, on: bool) -> bool {
    let changed = FULLSCREEN.swap(on, Ordering::SeqCst) != on;
    if changed {
        apply(app);
    }
    changed
}

pub fn show_for_user(app: &AppHandle) {
    USER_HIDDEN.store(false, Ordering::SeqCst);
    apply(app);
}
