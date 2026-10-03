//! Hide the native Windows taskbar and make sure it always comes back (AGENTS.md 5.6, pitfall 9).
//!
//! Safety net, from most to least common:
//! 1. normal exit: `restore()` runs on `RunEvent::Exit`;
//! 2. panic: a panic hook calls `restore()`;
//! 3. crash or kill: a tiny detached guard process (this same exe with `--taskbar-guard`) waits
//!    for the dock process to end and then restores the taskbar;
//! 4. anything else: the state file is checked at the next start.
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};

use dock_core::taskbar_state::{self, TaskbarState};
use windows::core::{w, BOOL};
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM};
use windows::Win32::System::Threading::{
    GetCurrentProcessId, OpenProcess, WaitForSingleObject, INFINITE, PROCESS_SYNCHRONIZE,
};
use windows::Win32::UI::Shell::{SHAppBarMessage, ABM_GETSTATE, ABM_SETSTATE, APPBARDATA};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowW, GetClassNameW, IsWindowVisible, ShowWindow, SW_HIDE, SW_SHOWNA,
};

use crate::error::{DockError, DockResult};

const DETACHED_PROCESS: u32 = 0x0000_0008;
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const AUTOHIDE: u32 = 1;

/// The user wants the taskbar hidden; the heartbeat re-hides it if Explorer brings it back.
static WANTED: AtomicBool = AtomicBool::new(false);

fn state_path() -> DockResult<PathBuf> {
    Ok(crate::config::app_dir()?.join("taskbar-state.json"))
}

unsafe extern "system" fn collect(h: HWND, lp: LPARAM) -> BOOL {
    // SAFETY: lp points at the Vec passed to EnumWindows below.
    let out = &mut *(lp.0 as *mut Vec<HWND>);
    let mut buf = [0u16; 64];
    let n = GetClassNameW(h, &mut buf) as usize;
    if String::from_utf16_lossy(&buf[..n]) == "Shell_SecondaryTrayWnd" {
        out.push(h);
    }
    BOOL(1)
}

/// The primary taskbar plus one per extra monitor.
fn taskbars() -> Vec<HWND> {
    let mut v = Vec::new();
    // SAFETY: plain lookups; the callback only runs during EnumWindows.
    unsafe {
        if let Ok(h) = FindWindowW(w!("Shell_TrayWnd"), None) {
            v.push(h);
        }
        let _ = EnumWindows(Some(collect), LPARAM(&mut v as *mut _ as isize));
    }
    v
}

fn appbar(h: HWND) -> APPBARDATA {
    APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, hWnd: h, ..Default::default() }
}

fn flags() -> u32 {
    let Ok(h) = (unsafe { FindWindowW(w!("Shell_TrayWnd"), None) }) else { return 0 };
    // SAFETY: APPBARDATA is initialized with its size.
    unsafe { SHAppBarMessage(ABM_GETSTATE, &mut appbar(h)) as u32 }
}

fn set_flags(f: u32) {
    let Ok(h) = (unsafe { FindWindowW(w!("Shell_TrayWnd"), None) }) else { return };
    let mut d = appbar(h);
    d.lParam = LPARAM(f as isize);
    // SAFETY: APPBARDATA is initialized with its size.
    unsafe { SHAppBarMessage(ABM_SETSTATE, &mut d) };
}

/// Show every taskbar again and put the auto-hide flag back as it was. Safe to call repeatedly.
pub fn restore_with(prev_flags: u32) {
    WANTED.store(false, Ordering::SeqCst);
    set_flags(prev_flags);
    for h in taskbars() {
        // SAFETY: plain call on a handle that was just enumerated.
        unsafe { let _ = ShowWindow(h, SW_SHOWNA); }
    }
    if let Ok(p) = state_path() {
        let _ = fs::remove_file(p);
    }
}

pub fn restore() {
    let prev = state_path()
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| taskbar_state::parse(&s))
        .map(|s| s.prev_flags)
        .unwrap_or_else(flags);
    restore_with(prev);
}

fn hide_all() {
    for h in taskbars() {
        // SAFETY: plain call on a handle that was just enumerated.
        unsafe { let _ = ShowWindow(h, SW_HIDE); }
    }
}

/// Undo our hiding, but only if we actually hid the taskbar. Called at startup, on exit and from
/// the panic hook, so it must never touch a taskbar the user configured themselves (for example
/// Windows' own auto-hide).
pub fn restore_if_hidden() {
    let had_state = state_path().map(|p| p.exists()).unwrap_or(false);
    if WANTED.load(Ordering::SeqCst) || had_state {
        restore();
    }
}

pub fn set_hidden(on: bool) -> DockResult<()> {
    if !on {
        restore_if_hidden();
        return Ok(());
    }
    if WANTED.load(Ordering::SeqCst) {
        return Ok(());
    }
    let pid = unsafe { GetCurrentProcessId() };
    let prev = flags();
    let state = TaskbarState { hidden: true, prev_flags: prev, pid };
    // Write the record and start the guard BEFORE hiding, so a crash can never strand the taskbar.
    fs::write(state_path()?, taskbar_state::serialize(&state))?;
    let exe = std::env::current_exe()?;
    if let Err(e) = Command::new(exe)
        .args(["--taskbar-guard", &pid.to_string(), &prev.to_string()])
        .creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW)
        .spawn()
    {
        let _ = fs::remove_file(state_path()?);
        return Err(DockError::OsError(format!("could not start the safety guard, taskbar left alone: {e}")));
    }
    WANTED.store(true, Ordering::SeqCst);
    set_flags(prev | AUTOHIDE);
    hide_all();
    Ok(())
}

/// Called every second: Explorer restarts and some updates re-show the taskbar.
pub fn enforce() {
    if WANTED.load(Ordering::SeqCst) && taskbars().iter().any(|h| unsafe { IsWindowVisible(*h).as_bool() }) {
        hide_all();
    }
}

fn process_alive(pid: u32) -> bool {
    // SAFETY: handle closed on every path.
    unsafe {
        match OpenProcess(PROCESS_SYNCHRONIZE, false, pid) {
            Ok(h) => {
                let alive = WaitForSingleObject(h, 0).0 == 0x102; // WAIT_TIMEOUT: still running
                let _ = CloseHandle(h);
                alive
            }
            Err(_) => false,
        }
    }
}

/// Run at every start: undo a hide left behind by a dock that no longer exists.
pub fn recover_after_crash() {
    let Ok(path) = state_path() else { return };
    let Some(state) = fs::read_to_string(&path).ok().and_then(|s| taskbar_state::parse(&s)) else { return };
    if taskbar_state::needs_recovery(&state, process_alive(state.pid)) {
        restore_with(state.prev_flags);
    }
}

/// Entry point of the guard process: wait for the dock to end, then restore.
pub fn run_guard(pid: u32, prev_flags: u32) {
    // SAFETY: handle closed after the wait.
    unsafe {
        if let Ok(h) = OpenProcess(PROCESS_SYNCHRONIZE, false, pid) {
            WaitForSingleObject(h, INFINITE);
            let _ = CloseHandle(h);
        }
    }
    restore_with(prev_flags);
}
