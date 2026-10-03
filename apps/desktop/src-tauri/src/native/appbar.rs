//! AppBar registration (AGENTS.md 5.6): reserves screen space so maximized windows stop at
//! the dock. Off by default; always removed on exit. Never touches the native taskbar.
use std::sync::atomic::{AtomicBool, Ordering};

use dock_core::layout::{appbar_rect, Position, Rect};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::Shell::{
    SHAppBarMessage, ABE_BOTTOM, ABE_LEFT, ABE_RIGHT, ABE_TOP, ABM_NEW, ABM_QUERYPOS, ABM_REMOVE,
    ABM_SETPOS, APPBARDATA,
};
use windows::Win32::UI::WindowsAndMessaging::WM_USER;

static REGISTERED: AtomicBool = AtomicBool::new(false);

fn data(hwnd: HWND) -> APPBARDATA {
    APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, hWnd: hwnd, ..Default::default() }
}


/// Reserve `thickness` physical pixels on `pos` of `monitor` (the full monitor rect).
pub fn reserve(hwnd: HWND, monitor: Rect, pos: Position, thickness: i32) {
    // SAFETY: APPBARDATA is fully initialized; the shell copies what it needs.
    unsafe {
        let mut d = data(hwnd);
        if !REGISTERED.swap(true, Ordering::SeqCst) {
            d.uCallbackMessage = WM_USER + 0x200;
            SHAppBarMessage(ABM_NEW, &mut d);
        }
        d.uEdge = match pos {
            Position::Bottom => ABE_BOTTOM,
            Position::Top => ABE_TOP,
            Position::Left => ABE_LEFT,
            Position::Right => ABE_RIGHT,
        };
        let want = appbar_rect(monitor, pos, thickness);
        d.rc = RECT { left: want.x, top: want.y, right: want.x + want.w, bottom: want.y + want.h };
        SHAppBarMessage(ABM_QUERYPOS, &mut d);
        // The shell may have shrunk the rect to avoid other bars; keep our thickness on our edge.
        match pos {
            Position::Bottom => d.rc.top = d.rc.bottom - thickness,
            Position::Top => d.rc.bottom = d.rc.top + thickness,
            Position::Left => d.rc.right = d.rc.left + thickness,
            Position::Right => d.rc.left = d.rc.right - thickness,
        }
        SHAppBarMessage(ABM_SETPOS, &mut d);
    }
}

pub fn release(hwnd: HWND) {
    if REGISTERED.swap(false, Ordering::SeqCst) {
        // SAFETY: APPBARDATA initialized; harmless if the shell already dropped us.
        unsafe {
            let mut d = data(hwnd);
            SHAppBarMessage(ABM_REMOVE, &mut d);
        }
    }
}
