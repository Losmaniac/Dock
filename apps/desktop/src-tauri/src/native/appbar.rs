//! AppBar registration (AGENTS.md 5.6): reserves screen space so maximized windows stop at
//! the dock. Off by default; always removed on exit. Never touches the native taskbar.
use std::collections::HashSet;
use std::sync::Mutex;

use dock_core::layout::{appbar_rect, Position, Rect};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::Shell::{
    SHAppBarMessage, ABE_BOTTOM, ABE_LEFT, ABE_RIGHT, ABE_TOP, ABM_NEW, ABM_QUERYPOS, ABM_REMOVE,
    ABM_SETPOS, APPBARDATA,
};
use windows::Win32::UI::WindowsAndMessaging::WM_USER;

/// One registration per dock window (a window can only be an AppBar once).
static REGISTERED: Mutex<Option<HashSet<isize>>> = Mutex::new(None);

fn registry() -> std::sync::MutexGuard<'static, Option<HashSet<isize>>> {
    REGISTERED.lock().unwrap_or_else(|p| p.into_inner())
}

fn data(hwnd: HWND) -> APPBARDATA {
    APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, hWnd: hwnd, ..Default::default() }
}


/// Reserve `thickness` physical pixels on `pos` of `monitor` (the full monitor rect).
pub fn reserve(hwnd: HWND, monitor: Rect, pos: Position, thickness: i32) {
    // SAFETY: APPBARDATA is fully initialized; the shell copies what it needs.
    unsafe {
        let mut d = data(hwnd);
        if registry().get_or_insert_with(HashSet::new).insert(hwnd.0 as isize) {
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
    let was = registry().as_mut().is_some_and(|set| set.remove(&(hwnd.0 as isize)));
    if was {
        // SAFETY: APPBARDATA initialized; harmless if the shell already dropped us.
        unsafe {
            let mut d = data(hwnd);
            SHAppBarMessage(ABM_REMOVE, &mut d);
        }
    }
}

/// Exit path: drop every registration this process still holds.
pub fn release_all() {
    let all: Vec<isize> = registry().as_ref().map(|s| s.iter().copied().collect()).unwrap_or_default();
    for h in all {
        release(HWND(h as *mut std::ffi::c_void));
    }
}
