//! Virtual desktop count/current index (registry, read only) and switching via the documented
//! Win+Ctrl+Left/Right shortcuts. No undocumented COM interfaces (see ADR 005).
use serde::Serialize;
use windows::core::w;
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_BINARY};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VIRTUAL_KEY, VK_CONTROL, VK_LEFT, VK_LWIN, VK_RIGHT,
};

use crate::error::{DockError, DockResult};

#[derive(Debug, Serialize)]
pub struct Desktops {
    pub count: usize,
    pub current: Option<usize>,
}

fn read(subkey: windows::core::PCWSTR, value: windows::core::PCWSTR) -> Vec<u8> {
    let mut size = 0u32;
    // SAFETY: first call asks for the size, second fills a buffer of exactly that size.
    unsafe {
        if RegGetValueW(HKEY_CURRENT_USER, subkey, value, RRF_RT_REG_BINARY, None, None, Some(&mut size)) != ERROR_SUCCESS {
            return Vec::new();
        }
        let mut buf = vec![0u8; size as usize];
        if RegGetValueW(HKEY_CURRENT_USER, subkey, value, RRF_RT_REG_BINARY, None, Some(buf.as_mut_ptr() as *mut _), Some(&mut size)) != ERROR_SUCCESS {
            return Vec::new();
        }
        buf.truncate(size as usize);
        buf
    }
}

pub fn desktops() -> Desktops {
    let key = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VirtualDesktops");
    let ids = read(key, w!("VirtualDesktopIDs"));
    let cur = read(key, w!("CurrentVirtualDesktop"));
    let (count, current) = dock_core::vdesk::parse(&ids, &cur);
    Desktops { count: count.max(1), current }
}

fn key(vk: VIRTUAL_KEY, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT { wVk: vk, dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) }, ..Default::default() },
        },
    }
}

/// `direction`: "left" or "right".
pub fn switch(direction: &str) -> DockResult<()> {
    let arrow = match direction {
        "left" => VK_LEFT,
        "right" => VK_RIGHT,
        _ => return Err(DockError::InvalidArgument("direction must be left or right".into())),
    };
    let inputs = [
        key(VK_LWIN, false), key(VK_CONTROL, false), key(arrow, false),
        key(arrow, true), key(VK_CONTROL, true), key(VK_LWIN, true),
    ];
    // SAFETY: `inputs` is a valid array of fully initialized INPUT structs.
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize == inputs.len() { Ok(()) } else { Err(DockError::OsError("Windows rejected the key presses".into())) }
}
