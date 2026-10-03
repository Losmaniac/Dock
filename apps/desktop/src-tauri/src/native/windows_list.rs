//! Window enumeration and control (AGENTS.md 5.1 / 5.2).
use std::ffi::c_void;

use serde::Serialize;
use windows::core::{BOOL, PWSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE, HWND, LPARAM, WPARAM};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
use windows::Win32::System::Threading::{
    GetCurrentProcessId, GetCurrentThreadId, OpenProcess, OpenProcessToken,
    QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::Storage::EnhancedStorage::PKEY_AppUserModel_ID;
use windows::Win32::System::Com::StructuredStorage::PropVariantToStringAlloc;
use windows::Win32::UI::Shell::PropertiesSystem::{IPropertyStore, SHGetPropertyStoreForWindow};
use windows::Win32::UI::WindowsAndMessaging::*;

use crate::error::{DockError, DockResult};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub hwnd: String,
    pub title: String,
    pub process_name: String,
    pub process_path: String,
    pub aumid: Option<String>,
    pub focused: bool,
    pub minimized: bool,
    pub elevated: bool,
    pub topmost: bool,
}

pub fn to_hwnd(s: &str) -> DockResult<HWND> {
    let n: usize = s
        .parse()
        .map_err(|_| DockError::InvalidArgument(format!("invalid window handle: {s}")))?;
    Ok(HWND(n as *mut c_void))
}

fn hwnd_to_string(h: HWND) -> String {
    (h.0 as usize).to_string()
}

fn title_of(hwnd: HWND) -> String {
    // SAFETY: buffer length matches the length passed in; hwnd may be stale, which only
    // makes the call return 0.
    unsafe {
        let len = GetWindowTextLengthW(hwnd);
        if len <= 0 {
            return String::new();
        }
        let mut buf = vec![0u16; len as usize + 1];
        let n = GetWindowTextW(hwnd, &mut buf);
        String::from_utf16_lossy(&buf[..n as usize])
    }
}

fn is_cloaked(hwnd: HWND) -> bool {
    let mut cloaked: u32 = 0;
    // SAFETY: out pointer is a valid u32 and the size matches DWMWA_CLOAKED's DWORD.
    let ok = unsafe {
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut u32 as *mut c_void,
            std::mem::size_of::<u32>() as u32,
        )
    };
    ok.is_ok() && cloaked != 0
}

/// Pitfalls 8 + the 5.1 filter: visible, top-level, no owner, not a tool window, not cloaked.
fn is_app_window(hwnd: HWND) -> bool {
    // SAFETY: plain queries on a handle; stale handles yield false/0.
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() {
            return false;
        }
        if GetWindow(hwnd, GW_OWNER).is_ok_and(|o| !o.is_invalid()) {
            return false;
        }
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if ex & WS_EX_TOOLWINDOW.0 != 0 && ex & WS_EX_APPWINDOW.0 == 0 {
            return false;
        }
        if GetWindowTextLengthW(hwnd) == 0 {
            return false;
        }
    }
    !is_cloaked(hwnd)
}

struct ProcInfo {
    path: String,
    elevated: bool,
}

fn process_info(pid: u32) -> Option<ProcInfo> {
    // SAFETY: handle is closed on every path; buffers are sized as passed.
    unsafe {
        let h = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            Ok(h) => h,
            // Access denied on a query-limited open means a higher integrity process.
            Err(_) => return Some(ProcInfo { path: String::new(), elevated: true }),
        };
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let path = if QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok() {
            String::from_utf16_lossy(&buf[..len as usize])
        } else {
            String::new()
        };
        let elevated = token_elevated(h);
        let _ = CloseHandle(h);
        Some(ProcInfo { path, elevated })
    }
}

/// SAFETY: caller passes a live process handle opened with query rights.
unsafe fn token_elevated(process: HANDLE) -> bool {
    let mut token = HANDLE::default();
    if OpenProcessToken(process, TOKEN_QUERY, &mut token).is_err() {
        return true; // cannot inspect it: assume we cannot control it either
    }
    let mut elev = TOKEN_ELEVATION::default();
    let mut ret = 0u32;
    let ok = GetTokenInformation(
        token,
        TokenElevation,
        Some(&mut elev as *mut _ as *mut c_void),
        std::mem::size_of::<TOKEN_ELEVATION>() as u32,
        &mut ret,
    )
    .is_ok();
    let _ = CloseHandle(token);
    ok && elev.TokenIsElevated != 0
}

fn file_name(path: &str) -> String {
    path.rsplit(['\\', '/']).next().unwrap_or(path).to_string()
}

/// Pitfall 7: Store apps are hosted by ApplicationFrameHost; the AUMID identifies them.
fn aumid_of(hwnd: HWND) -> Option<String> {
    // SAFETY: COM property store is released when dropped; PROPVARIANT cleared by windows-rs.
    unsafe {
        let store: IPropertyStore = SHGetPropertyStoreForWindow(hwnd).ok()?;
        let v = store.GetValue(&PKEY_AppUserModel_ID).ok()?;
        let s = PropVariantToStringAlloc(&v).ok()?;
        let out = s.to_string().ok().filter(|s| !s.is_empty());
        windows::Win32::System::Com::CoTaskMemFree(Some(s.0 as *const c_void));
        out
    }
}

unsafe extern "system" fn enum_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
    // SAFETY: lparam is the pointer to the Vec we passed to EnumWindows below.
    let out = &mut *(lparam.0 as *mut Vec<HWND>);
    if is_app_window(hwnd) {
        out.push(hwnd);
    }
    BOOL(1)
}

pub fn list_windows() -> Vec<WindowInfo> {
    let mut handles: Vec<HWND> = Vec::new();
    // SAFETY: the callback only runs during this call, while `handles` is alive.
    unsafe {
        let _ = EnumWindows(Some(enum_cb), LPARAM(&mut handles as *mut _ as isize));
    }
    // SAFETY: simple queries.
    let (fg, own_pid) = unsafe { (GetForegroundWindow(), GetCurrentProcessId()) };
    handles
        .into_iter()
        .filter_map(|hwnd| {
            let mut pid = 0u32;
            // SAFETY: pid is a valid out pointer.
            unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
            if pid == own_pid {
                return None;
            }
            let info = process_info(pid)?;
            let process_name = file_name(&info.path);
            let aumid = if process_name.eq_ignore_ascii_case("ApplicationFrameHost.exe") {
                aumid_of(hwnd)
            } else {
                None
            };
            Some(WindowInfo {
                hwnd: hwnd_to_string(hwnd),
                title: title_of(hwnd),
                process_name,
                process_path: info.path,
                aumid,
                focused: hwnd == fg,
                // SAFETY: simple query.
                minimized: unsafe { IsIconic(hwnd).as_bool() },
                elevated: info.elevated,
                topmost: super::winctl::is_topmost(hwnd),
            })
        })
        .collect()
}

/// Pitfall 6: refuse clearly instead of failing silently on elevated windows.
pub fn ensure_controllable(hwnd: HWND) -> DockResult<()> {
    let mut pid = 0u32;
    // SAFETY: pid is a valid out pointer.
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if process_info(pid).is_some_and(|p| p.elevated) && !self_elevated() {
        return Err(DockError::AccessDenied(
            "This window runs as administrator; start Glass Dock as administrator to control it."
                .into(),
        ));
    }
    Ok(())
}

fn self_elevated() -> bool {
    process_info(unsafe { GetCurrentProcessId() }).is_some_and(|p| p.elevated)
}

/// Pitfall 3: SetForegroundWindow is restricted; attach to the foreground thread's input.
pub fn focus(hwnd: HWND) -> DockResult<()> {
    ensure_controllable(hwnd)?;
    // SAFETY: all calls take handles/ids obtained just above; AttachThreadInput is detached
    // on every path before returning.
    unsafe {
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        }
        let fg = GetForegroundWindow();
        let fg_thread = GetWindowThreadProcessId(fg, None);
        let me = GetCurrentThreadId();
        let attached = fg_thread != 0
            && fg_thread != me
            && windows::Win32::System::Threading::AttachThreadInput(me, fg_thread, true).as_bool();
        let _ = BringWindowToTop(hwnd);
        let ok = SetForegroundWindow(hwnd).as_bool();
        if attached {
            let _ = windows::Win32::System::Threading::AttachThreadInput(me, fg_thread, false);
        }
        if !ok {
            return Err(DockError::OsError("Windows refused to focus the window".into()));
        }
    }
    Ok(())
}

pub fn minimize(hwnd: HWND) -> DockResult<()> {
    ensure_controllable(hwnd)?;
    // SAFETY: plain call on a handle.
    unsafe { let _ = ShowWindow(hwnd, SW_MINIMIZE); }
    Ok(())
}

pub fn close(hwnd: HWND) -> DockResult<()> {
    ensure_controllable(hwnd)?;
    // SAFETY: posts a message; a stale handle just fails.
    unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0))? };
    Ok(())
}
