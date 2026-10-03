//! Input validation for anything coming from config or drag-and-drop (AGENTS.md section 8).

/// Only web links and mail links may be opened; never `file:`, `javascript:`, custom schemes.
pub fn is_allowed_url(url: &str) -> bool {
    let lower = url.trim().to_ascii_lowercase();
    ["https://", "http://", "mailto:"].iter().any(|p| lower.starts_with(p))
        && !url.chars().any(|c| c.is_control())
}

/// AppUserModelIDs look like `Publisher.App_8wekyb3d8bbwe!App`.
pub fn is_valid_aumid(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 256
        && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '!' | '-' | '+'))
}

/// Rejects relative paths and device/UNC-device namespaces. Existence is checked by callers.
pub fn is_plain_absolute_windows_path(p: &str) -> bool {
    let b = p.as_bytes();
    let drive = b.len() >= 3 && b[0].is_ascii_alphabetic() && b[1] == b':' && (b[2] == b'\\' || b[2] == b'/');
    let unc = p.starts_with("\\\\") && !p.starts_with("\\\\?\\") && !p.starts_with("\\\\.\\");
    (drive || unc) && !p.contains('\0')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn urls() {
        assert!(is_allowed_url("https://example.com"));
        assert!(is_allowed_url(" HTTP://x.y"));
        assert!(!is_allowed_url("file:///C:/Windows/System32/cmd.exe"));
        assert!(!is_allowed_url("javascript:alert(1)"));
        assert!(!is_allowed_url("ms-msdt:/id x"));
        assert!(!is_allowed_url("https://a.b\r\nx"));
    }

    #[test]
    fn aumids() {
        assert!(is_valid_aumid("Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"));
        assert!(!is_valid_aumid("a b"));
        assert!(!is_valid_aumid("x & calc"));
        assert!(!is_valid_aumid(""));
    }

    #[test]
    fn paths() {
        assert!(is_plain_absolute_windows_path("C:\\Windows\\notepad.exe"));
        assert!(is_plain_absolute_windows_path("\\\\server\\share\\a.exe"));
        assert!(!is_plain_absolute_windows_path("notepad.exe"));
        assert!(!is_plain_absolute_windows_path("..\\x.exe"));
        assert!(!is_plain_absolute_windows_path("\\\\?\\C:\\x"));
    }
}

/// MIME type from the first bytes of an image file; `None` for anything else, so a wallpaper
/// path that points at a non-image is never handed to the webview.
pub fn sniff_image_mime(b: &[u8]) -> Option<&'static str> {
    if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if b.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("image/png")
    } else if b.starts_with(b"BM") {
        Some("image/bmp")
    } else if b.len() > 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

#[cfg(test)]
mod image_tests {
    use super::sniff_image_mime;

    #[test]
    fn recognizes_common_wallpaper_formats_only() {
        assert_eq!(sniff_image_mime(&[0xFF, 0xD8, 0xFF, 0xE0]), Some("image/jpeg"));
        assert_eq!(sniff_image_mime(b"\x89PNG\r\n"), Some("image/png"));
        assert_eq!(sniff_image_mime(b"BM6\0"), Some("image/bmp"));
        assert_eq!(sniff_image_mime(b"RIFF\0\0\0\0WEBPVP8 "), Some("image/webp"));
        assert_eq!(sniff_image_mime(b"MZ\x90\0"), None);
        assert_eq!(sniff_image_mime(b""), None);
    }
}

/// Page part of an `ms-settings:` link, e.g. `display` or `network-wifi`. Empty means the
/// Settings home page. Only lowercase letters, digits and `-` are allowed.
pub fn is_valid_settings_page(p: &str) -> bool {
    p.len() <= 64 && p.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

#[cfg(test)]
mod settings_tests {
    use super::is_valid_settings_page;

    #[test]
    fn only_plain_page_names() {
        assert!(is_valid_settings_page(""));
        assert!(is_valid_settings_page("network-wifi"));
        assert!(!is_valid_settings_page("display?x=1"));
        assert!(!is_valid_settings_page("../x"));
        assert!(!is_valid_settings_page("Display"));
    }
}

/// Dock ids are UUIDs written by the app; anything else never becomes a window label or URL.
pub fn valid_dock_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

#[cfg(test)]
mod dock_id_tests {
    use super::valid_dock_id;

    #[test]
    fn accepts_uuids_and_rejects_anything_that_could_escape_a_url_or_label() {
        assert!(valid_dock_id("3f2c9e1a-4b5d-4c6e-8f70-123456789abc"));
        assert!(!valid_dock_id(""));
        assert!(!valid_dock_id("a/b"));
        assert!(!valid_dock_id("a?x=1"));
        assert!(!valid_dock_id("../main"));
        assert!(!valid_dock_id(&"a".repeat(65)));
    }
}
