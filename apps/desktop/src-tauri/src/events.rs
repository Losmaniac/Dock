//! Window-change events via SetWinEventHook (AGENTS.md 4.2: no polling in the frontend).
//! A hook thread feeds a debouncer; the debouncer enumerates and emits only on real change.
use std::sync::mpsc::{channel, RecvTimeoutError, Sender};
use std::sync::OnceLock;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Accessibility::{SetWinEventHook, HWINEVENTHOOK};
use windows::Win32::UI::WindowsAndMessaging::{
    DispatchMessageW, GetMessageW, TranslateMessage, EVENT_OBJECT_CLOAKED, EVENT_OBJECT_CREATE,
    EVENT_OBJECT_DESTROY, EVENT_OBJECT_HIDE, EVENT_OBJECT_NAMECHANGE, EVENT_OBJECT_SHOW,
    EVENT_OBJECT_UNCLOAKED, EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_MINIMIZEEND,
    EVENT_SYSTEM_MINIMIZESTART, MSG, OBJID_WINDOW, WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS,
};

use windows::Win32::UI::Shell::{
    SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN,
};

use crate::native::{monitors, windows_list};

static TX: OnceLock<Sender<()>> = OnceLock::new();

unsafe extern "system" fn on_event(
    _h: HWINEVENTHOOK,
    _event: u32,
    _hwnd: HWND,
    id_object: i32,
    id_child: i32,
    _thread: u32,
    _time: u32,
) {
    // Only top-level window events; cursor/caret/child noise is dropped here.
    if id_object == OBJID_WINDOW.0 && id_child == 0 {
        if let Some(tx) = TX.get() {
            let _ = tx.send(());
        }
    }
}

pub fn start(app: AppHandle) {
    let (tx, rx) = channel::<()>();
    let _ = TX.set(tx);

    std::thread::spawn(move || {
        // SAFETY: the callback is a plain `extern "system"` fn; the thread pumps messages
        // for its whole life, which WINEVENT_OUTOFCONTEXT requires.
        unsafe {
            let ranges = [
                (EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND),
                (EVENT_SYSTEM_MINIMIZESTART, EVENT_SYSTEM_MINIMIZEEND),
                (EVENT_OBJECT_CREATE, EVENT_OBJECT_HIDE),
                (EVENT_OBJECT_NAMECHANGE, EVENT_OBJECT_NAMECHANGE),
                (EVENT_OBJECT_CLOAKED, EVENT_OBJECT_UNCLOAKED),
            ];
            let _ = (EVENT_OBJECT_DESTROY, EVENT_OBJECT_SHOW); // inside CREATE..HIDE
            for (lo, hi) in ranges {
                SetWinEventHook(lo, hi, None, Some(on_event), 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);
            }
            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
    });

    std::thread::spawn(move || {
        let mut last = Vec::new();
        let mut last_monitors = monitors::list();
        let mut push = |app: &AppHandle| {
            let now = windows_list::list_windows();
            if now != last {
                let _ = app.emit("windows-changed", &now);
                last = now;
            }
        };
        push(&app);
        loop {
            // Window events wake us immediately; otherwise a 1 s heartbeat checks the two
            // things Windows gives no event for (fullscreen apps, display layout changes).
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(()) => {
                    std::thread::sleep(Duration::from_millis(40));
                    while rx.try_recv().is_ok() {} // coalesce bursts into one enumeration
                    push(&app);
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
            crate::native::taskbar::enforce();
            if crate::visibility::set_fullscreen(&app, fullscreen_app_running()) {
                let _ = app.emit("fullscreen-changed", ());
            }
            let now = monitors::list();
            if now != last_monitors {
                let _ = app.emit("monitors-changed", &now);
                last_monitors = now;
            }
        }
    });
}

/// Pitfall: games and video players in fullscreen should not have a dock drawn over them.
fn fullscreen_app_running() -> bool {
    // SAFETY: plain query with no arguments.
    match unsafe { SHQueryUserNotificationState() } {
        Ok(s) => s == QUNS_BUSY || s == QUNS_RUNNING_D3D_FULL_SCREEN || s == QUNS_PRESENTATION_MODE,
        Err(_) => false,
    }
}
