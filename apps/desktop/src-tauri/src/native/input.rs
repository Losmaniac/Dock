use windows::Win32::Globalization::LCIDToLocaleName;
use windows::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayout;
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

/// BCP-47 tag (for example `en-US`) of the keyboard layout used by the foreground window.
pub fn keyboard_language() -> String {
    // SAFETY: plain queries; a missing foreground window gives thread 0, which means "this thread".
    unsafe {
        let tid = GetWindowThreadProcessId(GetForegroundWindow(), None);
        let hkl = GetKeyboardLayout(tid);
        let langid = (hkl.0 as usize & 0xFFFF) as u32;
        let mut buf = [0u16; 85];
        let n = LCIDToLocaleName(langid, Some(&mut buf), 0);
        if n <= 1 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..(n as usize - 1)])
    }
}
