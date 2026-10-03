//! Dock windows are hidden when the user toggles them or a fullscreen app/game is running.
//! Every dock window (the main one and any `dock-*` window) follows the same rules.
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Manager};

static USER_HIDDEN: AtomicBool = AtomicBool::new(false);
static FULLSCREEN: AtomicBool = AtomicBool::new(false);
/// Labels of windows that already received their first placement (until then they stay hidden,
/// which avoids a flash at the wrong position).
static PLACED: Mutex<Option<HashSet<String>>> = Mutex::new(None);

pub fn is_dock_label(label: &str) -> bool {
    label == "main" || label.starts_with("dock-")
}

fn should_hide() -> bool {
    USER_HIDDEN.load(Ordering::SeqCst) || FULLSCREEN.load(Ordering::SeqCst)
}

fn apply(app: &AppHandle) {
    let placed = PLACED.lock().unwrap_or_else(|p| p.into_inner());
    let Some(set) = placed.as_ref() else { return };
    for (label, w) in app.webview_windows() {
        if is_dock_label(&label) && set.contains(&label) {
            let _ = if should_hide() { w.hide() } else { w.show() };
        }
    }
}

/// Reveal `label` after its first placement; afterwards only the user toggle and fullscreen
/// detection decide whether it is visible.
pub fn mark_placed(app: &AppHandle, label: &str) {
    let first = {
        let mut g = PLACED.lock().unwrap_or_else(|p| p.into_inner());
        g.get_or_insert_with(HashSet::new).insert(label.to_string())
    };
    if first {
        apply(app);
    }
}

pub fn forget(label: &str) {
    if let Some(set) = PLACED.lock().unwrap_or_else(|p| p.into_inner()).as_mut() {
        set.remove(label);
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
