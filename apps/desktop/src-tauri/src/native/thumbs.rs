//! Live window previews with the DWM Thumbnail API (AGENTS.md 5.2, phase 3). DWM composites
//! the thumbnail over the dock window itself, so the UI only reserves a rectangle for it.
use std::collections::HashMap;
use std::sync::Mutex;

use dock_core::layout::{fit_rect, Rect};
use windows::Win32::Foundation::{HWND, RECT, SIZE};
use windows::Win32::Graphics::Dwm::{
    DwmQueryThumbnailSourceSize, DwmRegisterThumbnail, DwmUnregisterThumbnail,
    DwmUpdateThumbnailProperties, DWM_THUMBNAIL_PROPERTIES, DWM_TNP_OPACITY, DWM_TNP_RECTDESTINATION,
    DWM_TNP_VISIBLE,
};

use crate::error::DockResult;

/// (dock window, source window) -> HTHUMBNAIL. Keyed by both so two docks can preview the same app.
static ACTIVE: Mutex<Option<HashMap<(isize, isize), isize>>> = Mutex::new(None);

/// `dest` is in physical pixels relative to the dock window's client area.
pub fn show(dock: HWND, source: HWND, dest: Rect) -> DockResult<()> {
    let mut guard = ACTIVE.lock().unwrap_or_else(|p| p.into_inner());
    let map = guard.get_or_insert_with(HashMap::new);
    let key = (dock.0 as isize, source.0 as isize);
    // SAFETY: handles come from this process / EnumWindows; thumbnails are unregistered in
    // `hide_all` and whenever a source disappears (registration then fails and is dropped).
    unsafe {
        let thumb = match map.get(&key) {
            Some(t) => *t,
            None => {
                let t = DwmRegisterThumbnail(dock, source)?;
                map.insert(key, t);
                t
            }
        };
        let size: SIZE = DwmQueryThumbnailSourceSize(thumb)?;
        let fit = fit_rect(size.cx, size.cy, dest);
        let props = DWM_THUMBNAIL_PROPERTIES {
            dwFlags: DWM_TNP_RECTDESTINATION | DWM_TNP_VISIBLE | DWM_TNP_OPACITY,
            rcDestination: RECT { left: fit.x, top: fit.y, right: fit.x + fit.w, bottom: fit.y + fit.h },
            fVisible: true.into(),
            opacity: 255,
            ..Default::default()
        };
        DwmUpdateThumbnailProperties(thumb, &props)?;
    }
    Ok(())
}

/// Drop every thumbnail owned by `dock`.
pub fn hide_all(dock: HWND) {
    let mut guard = ACTIVE.lock().unwrap_or_else(|p| p.into_inner());
    if let Some(map) = guard.as_mut() {
        let mine: Vec<(isize, isize)> = map.keys().filter(|(d, _)| *d == dock.0 as isize).copied().collect();
        for k in mine {
            if let Some(t) = map.remove(&k) {
                // SAFETY: handle was returned by DwmRegisterThumbnail and is removed from the map.
                unsafe { let _ = DwmUnregisterThumbnail(t); }
            }
        }
    }
}
