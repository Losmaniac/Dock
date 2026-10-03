//! Window control actions (AGENTS.md 5.2, phase 2).
use dock_core::layout::{apply_insets, map_between_areas, opacity_to_alpha, snap_rect, Insets, Rect, SnapLayout};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};
use windows::Win32::UI::WindowsAndMessaging::*;

use super::monitors;
use crate::error::{DockError, DockResult};

fn frame_insets(hwnd: HWND) -> Insets {
    let (mut outer, mut visible) = (RECT::default(), RECT::default());
    // SAFETY: out pointers are valid RECTs; size matches the attribute.
    unsafe {
        if GetWindowRect(hwnd, &mut outer).is_err() {
            return Insets::default();
        }
        if DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut visible as *mut _ as *mut _,
            std::mem::size_of::<RECT>() as u32,
        )
        .is_err()
        {
            return Insets::default();
        }
    }
    Insets {
        left: visible.left - outer.left,
        top: visible.top - outer.top,
        right: outer.right - visible.right,
        bottom: outer.bottom - visible.bottom,
    }
}

fn place(hwnd: HWND, visible_target: Rect) -> DockResult<()> {
    let r = apply_insets(visible_target, frame_insets(hwnd));
    // SAFETY: plain calls; a maximized window must be restored first or it ignores the move.
    unsafe {
        if IsZoomed(hwnd).as_bool() || IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        }
        SetWindowPos(hwnd, None, r.x, r.y, r.w, r.h, SWP_NOZORDER | SWP_NOACTIVATE)?;
    }
    Ok(())
}

pub fn snap(hwnd: HWND, layout: SnapLayout) -> DockResult<()> {
    let mon = monitors::of_window(hwnd).ok_or_else(|| DockError::OsError("no monitor for window".into()))?;
    if layout == SnapLayout::Maximize {
        // SAFETY: plain call.
        unsafe { let _ = ShowWindow(hwnd, SW_MAXIMIZE); }
        return Ok(());
    }
    place(hwnd, snap_rect(mon.work, layout))
}

pub fn move_to_monitor(hwnd: HWND, monitor_id: &str) -> DockResult<()> {
    let from = monitors::of_window(hwnd).ok_or_else(|| DockError::OsError("no monitor for window".into()))?;
    let to = monitors::list()
        .into_iter()
        .find(|m| m.id == monitor_id)
        .ok_or_else(|| DockError::InvalidArgument(format!("unknown monitor {monitor_id}")))?;
    if from.id == to.id {
        return Ok(());
    }
    // SAFETY: plain calls.
    let (was_max, mut cur) = unsafe {
        let max = IsZoomed(hwnd).as_bool();
        if max {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        }
        let mut r = RECT::default();
        let _ = GetWindowRect(hwnd, &mut r);
        (max, monitors::rect(r))
    };
    cur = map_between_areas(cur, from.work, to.work);
    SetPos(hwnd, cur)?;
    if was_max {
        // SAFETY: plain call.
        unsafe { let _ = ShowWindow(hwnd, SW_MAXIMIZE); }
    }
    Ok(())
}

#[allow(non_snake_case)]
fn SetPos(hwnd: HWND, r: Rect) -> DockResult<()> {
    // SAFETY: plain call.
    unsafe { SetWindowPos(hwnd, None, r.x, r.y, r.w, r.h, SWP_NOZORDER | SWP_NOACTIVATE)? };
    Ok(())
}

pub fn set_always_on_top(hwnd: HWND, on: bool) -> DockResult<()> {
    let after = if on { HWND_TOPMOST } else { HWND_NOTOPMOST };
    // SAFETY: plain call; position/size untouched.
    unsafe { SetWindowPos(hwnd, Some(after), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)? };
    Ok(())
}

pub fn is_topmost(hwnd: HWND) -> bool {
    // SAFETY: plain query.
    unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) as u32 & WS_EX_TOPMOST.0 != 0 }
}

pub fn set_opacity(hwnd: HWND, value: f64) -> DockResult<()> {
    // SAFETY: read-modify-write of the target's extended style, then the layered alpha.
    unsafe {
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if ex & WS_EX_LAYERED.0 == 0 {
            SetWindowLongW(hwnd, GWL_EXSTYLE, (ex | WS_EX_LAYERED.0) as i32);
        }
        SetLayeredWindowAttributes(hwnd, windows::Win32::Foundation::COLORREF(0), opacity_to_alpha(value), LWA_ALPHA)?;
    }
    Ok(())
}
