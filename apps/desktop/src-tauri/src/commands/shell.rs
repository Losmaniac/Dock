use serde::Deserialize;
use tauri::WebviewWindow;

use crate::error::DockResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlurMode {
    Mica,
    Acrylic,
    Blur,
    None,
}

/// Fallback order when a mode is unavailable on this Windows build.
/// Pure logic, unit-tested: Mica (Win11) -> Acrylic -> Blur -> none.
pub fn fallback_chain(requested: BlurMode) -> &'static [BlurMode] {
    match requested {
        BlurMode::Mica => &[BlurMode::Mica, BlurMode::Acrylic, BlurMode::Blur],
        BlurMode::Acrylic => &[BlurMode::Acrylic, BlurMode::Blur],
        BlurMode::Blur => &[BlurMode::Blur],
        BlurMode::None => &[],
    }
}

/// Applies native blur behind the (transparent) window. Returns the mode that took effect.
#[cfg(windows)]
pub fn apply_blur(window: &WebviewWindow, requested: BlurMode) -> DockResult<Option<BlurMode>> {
    use window_vibrancy::{
        apply_acrylic, apply_blur as vibrancy_blur, apply_mica, clear_acrylic, clear_blur,
        clear_mica,
    };
    // Clear all first so switching modes never stacks effects. Errors are expected when
    // the effect was not applied, so they are intentionally ignored.
    let _ = clear_mica(window);
    let _ = clear_acrylic(window);
    let _ = clear_blur(window);

    for mode in fallback_chain(requested) {
        let ok = match mode {
            BlurMode::Mica => apply_mica(window, None).is_ok(),
            BlurMode::Acrylic => apply_acrylic(window, Some((18, 18, 18, 80))).is_ok(),
            BlurMode::Blur => vibrancy_blur(window, Some((18, 18, 18, 80))).is_ok(),
            BlurMode::None => true,
        };
        if ok {
            return Ok(Some(*mode));
        }
    }
    Ok(None)
}

#[cfg(not(windows))]
pub fn apply_blur(_window: &WebviewWindow, _requested: BlurMode) -> DockResult<Option<BlurMode>> {
    Err(crate::error::DockError::NotSupported(
        "native blur is only available on Windows".into(),
    ))
}

#[tauri::command]
pub fn set_blur_mode(window: WebviewWindow, mode: BlurMode) -> DockResult<()> {
    apply_blur(&window, mode).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mica_falls_back_through_acrylic_to_blur() {
        assert_eq!(
            fallback_chain(BlurMode::Mica),
            &[BlurMode::Mica, BlurMode::Acrylic, BlurMode::Blur]
        );
    }

    #[test]
    fn none_applies_nothing() {
        assert!(fallback_chain(BlurMode::None).is_empty());
    }

    #[test]
    fn deserializes_lowercase_names() {
        let m: BlurMode = serde_json::from_str("\"acrylic\"").unwrap();
        assert_eq!(m, BlurMode::Acrylic);
    }
}
