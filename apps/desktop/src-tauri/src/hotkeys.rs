//! Global hotkeys (AGENTS.md 5.3). Registration failures are returned to the UI, never swallowed.
use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::error::{DockError, DockResult};

static BOUND: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

pub const TOGGLE_DOCK: &str = "toggle-dock";

/// Empty `accelerator` just unregisters the action.
pub fn register(app: &AppHandle, accelerator: &str, action: &str) -> DockResult<()> {
    let gs = app.global_shortcut();
    let mut guard = BOUND.lock().unwrap_or_else(|p| p.into_inner());
    let map = guard.get_or_insert_with(HashMap::new);
    if let Some(old) = map.remove(action) {
        let _ = gs.unregister(old.as_str());
    }
    if accelerator.trim().is_empty() {
        return Ok(());
    }
    let action_owned = action.to_string();
    gs.on_shortcut(accelerator, move |app, _shortcut, event| {
        if event.state != ShortcutState::Pressed {
            return;
        }
        if action_owned == TOGGLE_DOCK {
            crate::visibility::toggle_user(app);
        } else {
            let _ = app.emit("hotkey", &action_owned);
        }
    })
    .map_err(|e| {
        DockError::InvalidArgument(format!(
            "Could not register \"{accelerator}\" ({e}). It may be used by another app."
        ))
    })?;
    map.insert(action.to_string(), accelerator.to_string());
    Ok(())
}
