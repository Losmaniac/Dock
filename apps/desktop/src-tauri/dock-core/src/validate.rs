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
