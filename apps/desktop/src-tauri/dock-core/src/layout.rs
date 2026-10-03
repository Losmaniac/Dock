//! Pure geometry (no Win32, no Tauri): unit-testable on any host.
//! All values are physical pixels.

use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

impl Rect {
    pub const fn new(x: i32, y: i32, w: i32, h: i32) -> Self {
        Self { x, y, w, h }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Position {
    Bottom,
    Top,
    Left,
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DockMode {
    /// Only a thin hot-edge strip is on screen (auto-hide).
    Hidden,
    /// Window hugs the dock: transparent area never blocks windows underneath.
    Rest,
    /// Window also covers the magnification headroom while the pointer is over the dock.
    Active,
    /// Covers the whole monitor (window switcher overlay).
    Fullscreen,
}

pub const HOT_EDGE: i32 = 4;

/// Window rectangle for the dock. `length` is the dock size along its axis,
/// `thickness` the size across it (already including headroom for `Active`).
pub fn dock_rect(
    area: Rect,
    pos: Position,
    length: i32,
    thickness: i32,
    margin: i32,
    mode: DockMode,
) -> Rect {
    if mode == DockMode::Fullscreen {
        return area;
    }
    let horizontal = matches!(pos, Position::Bottom | Position::Top);
    let along_max = if horizontal { area.w } else { area.h };
    let length = length.clamp(1, along_max);
    let across = match mode {
        DockMode::Hidden => HOT_EDGE,
        _ => thickness.max(1),
    };
    let margin = if mode == DockMode::Hidden { 0 } else { margin.max(0) };
    match pos {
        Position::Bottom => Rect::new(
            area.x + (area.w - length) / 2,
            area.y + area.h - across - margin,
            length,
            across,
        ),
        Position::Top => Rect::new(area.x + (area.w - length) / 2, area.y + margin, length, across),
        Position::Left => Rect::new(area.x + margin, area.y + (area.h - length) / 2, across, length),
        Position::Right => Rect::new(
            area.x + area.w - across - margin,
            area.y + (area.h - length) / 2,
            across,
            length,
        ),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SnapLayout {
    LeftHalf,
    RightHalf,
    TopHalf,
    BottomHalf,
    Maximize,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    LeftThird,
    CenterThird,
    RightThird,
}

/// Target rectangle for a snap layout inside a monitor work area.
pub fn snap_rect(work: Rect, layout: SnapLayout) -> Rect {
    let (hw, hh) = (work.w / 2, work.h / 2);
    let tw = work.w / 3;
    let (x, y) = (work.x, work.y);
    match layout {
        SnapLayout::LeftHalf => Rect::new(x, y, hw, work.h),
        SnapLayout::RightHalf => Rect::new(x + hw, y, work.w - hw, work.h),
        SnapLayout::TopHalf => Rect::new(x, y, work.w, hh),
        SnapLayout::BottomHalf => Rect::new(x, y + hh, work.w, work.h - hh),
        SnapLayout::Maximize => work,
        SnapLayout::TopLeft => Rect::new(x, y, hw, hh),
        SnapLayout::TopRight => Rect::new(x + hw, y, work.w - hw, hh),
        SnapLayout::BottomLeft => Rect::new(x, y + hh, hw, work.h - hh),
        SnapLayout::BottomRight => Rect::new(x + hw, y + hh, work.w - hw, work.h - hh),
        SnapLayout::LeftThird => Rect::new(x, y, tw, work.h),
        SnapLayout::CenterThird => Rect::new(x + tw, y, tw, work.h),
        SnapLayout::RightThird => Rect::new(x + 2 * tw, y, work.w - 2 * tw, work.h),
    }
}

/// Move `r` from one monitor work area to another keeping its relative position and size
/// proportion (so a half-screen window stays a half-screen window across resolutions).
pub fn map_between_areas(r: Rect, from: Rect, to: Rect) -> Rect {
    let sx = to.w as f64 / from.w.max(1) as f64;
    let sy = to.h as f64 / from.h.max(1) as f64;
    Rect::new(
        to.x + ((r.x - from.x) as f64 * sx).round() as i32,
        to.y + ((r.y - from.y) as f64 * sy).round() as i32,
        ((r.w as f64) * sx).round() as i32,
        ((r.h as f64) * sy).round() as i32,
    )
}

/// Largest rectangle with the source aspect ratio that fits inside `dest`, centered.
/// Used so a DWM thumbnail is never stretched.
pub fn fit_rect(src_w: i32, src_h: i32, dest: Rect) -> Rect {
    if src_w <= 0 || src_h <= 0 || dest.w <= 0 || dest.h <= 0 {
        return dest;
    }
    let scale = (dest.w as f64 / src_w as f64).min(dest.h as f64 / src_h as f64);
    let (w, h) = ((src_w as f64 * scale).round() as i32, (src_h as f64 * scale).round() as i32);
    Rect::new(dest.x + (dest.w - w) / 2, dest.y + (dest.h - h) / 2, w, h)
}

/// A window rectangle as fractions of a monitor work area, so a saved layout survives
/// resolution and monitor changes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Fractions {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

pub fn to_fractions(r: Rect, work: Rect) -> Fractions {
    let (ww, wh) = (work.w.max(1) as f64, work.h.max(1) as f64);
    Fractions {
        x: (r.x - work.x) as f64 / ww,
        y: (r.y - work.y) as f64 / wh,
        w: r.w as f64 / ww,
        h: r.h as f64 / wh,
    }
}

pub fn from_fractions(f: Fractions, work: Rect) -> Rect {
    Rect::new(
        work.x + (f.x * work.w as f64).round() as i32,
        work.y + (f.y * work.h as f64).round() as i32,
        (f.w * work.w as f64).round() as i32,
        (f.h * work.h as f64).round() as i32,
    )
}

/// Invisible resize borders Windows 10/11 draws around a window (difference between
/// `GetWindowRect` and the DWM extended frame bounds).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Insets {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

/// Grow a target (visible) rectangle by the invisible borders so the *visible* frame lands
/// exactly on the snap target and neighbouring windows touch without gaps.
pub fn apply_insets(visible: Rect, i: Insets) -> Rect {
    Rect::new(
        visible.x - i.left,
        visible.y - i.top,
        visible.w + i.left + i.right,
        visible.h + i.top + i.bottom,
    )
}

/// Screen space a reserved AppBar claims on one edge of a monitor.
pub fn appbar_rect(monitor: Rect, pos: Position, thickness: i32) -> Rect {
    match pos {
        Position::Bottom => Rect::new(monitor.x, monitor.y + monitor.h - thickness, monitor.w, thickness),
        Position::Top => Rect::new(monitor.x, monitor.y, monitor.w, thickness),
        Position::Left => Rect::new(monitor.x, monitor.y, thickness, monitor.h),
        Position::Right => Rect::new(monitor.x + monitor.w - thickness, monitor.y, thickness, monitor.h),
    }
}

/// 0..1 opacity to the 0..255 alpha byte `SetLayeredWindowAttributes` expects.
/// Clamped to a minimum so a window can never be made invisible by accident.
pub fn opacity_to_alpha(v: f64) -> u8 {
    let v = if v.is_nan() { 1.0 } else { v };
    (v.clamp(0.1, 1.0) * 255.0).round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    const EDGE_MARGIN: i32 = 8;
    const WORK: Rect = Rect::new(0, 0, 1920, 1040);

    #[test]
    fn bottom_dock_is_centered_above_the_edge() {
        let r = dock_rect(WORK, Position::Bottom, 600, 100, EDGE_MARGIN, DockMode::Rest);
        assert_eq!(r, Rect::new(660, 1040 - 100 - EDGE_MARGIN, 600, 100));
    }

    #[test]
    fn hidden_dock_is_a_hot_edge_strip_flush_with_the_edge() {
        let r = dock_rect(WORK, Position::Bottom, 600, 100, EDGE_MARGIN, DockMode::Hidden);
        assert_eq!((r.h, r.y + r.h), (HOT_EDGE, 1040));
        let l = dock_rect(WORK, Position::Left, 600, 100, EDGE_MARGIN, DockMode::Hidden);
        assert_eq!((l.x, l.w), (0, HOT_EDGE));
    }

    #[test]
    fn side_docks_swap_axes() {
        let r = dock_rect(WORK, Position::Right, 400, 90, EDGE_MARGIN, DockMode::Rest);
        assert_eq!((r.w, r.h), (90, 400));
        assert_eq!(r.x + r.w + EDGE_MARGIN, 1920);
        assert_eq!(r.y, (1040 - 400) / 2);
    }

    #[test]
    fn length_is_clamped_to_the_work_area() {
        let r = dock_rect(WORK, Position::Top, 5000, 80, 0, DockMode::Rest);
        assert_eq!((r.x, r.w), (0, 1920));
    }

    #[test]
    fn halves_tile_the_work_area_without_gaps() {
        let l = snap_rect(WORK, SnapLayout::LeftHalf);
        let r = snap_rect(WORK, SnapLayout::RightHalf);
        assert_eq!(l.w + r.w, WORK.w);
        assert_eq!(l.x + l.w, r.x);
    }

    #[test]
    fn odd_sizes_still_tile() {
        let w = Rect::new(10, 20, 1001, 777);
        let q = [
            snap_rect(w, SnapLayout::TopLeft),
            snap_rect(w, SnapLayout::TopRight),
            snap_rect(w, SnapLayout::BottomLeft),
            snap_rect(w, SnapLayout::BottomRight),
        ];
        assert_eq!(q[0].w + q[1].w, w.w);
        assert_eq!(q[0].h + q[2].h, w.h);
        assert_eq!(q[3].x + q[3].w, w.x + w.w);
        assert_eq!(q[3].y + q[3].h, w.y + w.h);
    }

    #[test]
    fn thirds_cover_the_width() {
        let a = snap_rect(WORK, SnapLayout::LeftThird);
        let b = snap_rect(WORK, SnapLayout::CenterThird);
        let c = snap_rect(WORK, SnapLayout::RightThird);
        assert_eq!(a.w + b.w + c.w, WORK.w);
        assert_eq!(c.x + c.w, WORK.x + WORK.w);
    }

    #[test]
    fn moving_between_monitors_keeps_relative_placement() {
        let from = Rect::new(0, 0, 1920, 1080);
        let to = Rect::new(1920, 0, 2560, 1440);
        let half = snap_rect(from, SnapLayout::RightHalf);
        let moved = map_between_areas(half, from, to);
        assert_eq!(moved, snap_rect(to, SnapLayout::RightHalf));
    }

    #[test]
    fn fullscreen_mode_covers_the_whole_area() {
        let r = dock_rect(WORK, Position::Bottom, 600, 100, 8, DockMode::Fullscreen);
        assert_eq!(r, WORK);
    }

    #[test]
    fn thumbnails_keep_aspect_ratio_and_center() {
        let dest = Rect::new(10, 10, 200, 200);
        let r = fit_rect(1600, 900, dest);
        assert_eq!((r.w, r.h), (200, 113));
        assert_eq!(r.x, 10);
        assert_eq!(r.y, 10 + (200 - 113) / 2);
        assert_eq!(fit_rect(0, 0, dest), dest);
    }

    #[test]
    fn fractions_round_trip_across_resolutions() {
        let a = Rect::new(0, 0, 1920, 1040);
        let r = Rect::new(480, 260, 960, 520);
        let f = to_fractions(r, a);
        assert_eq!(from_fractions(f, a), r);
        let b = Rect::new(1920, 0, 2560, 1400);
        assert_eq!(from_fractions(f, b), Rect::new(1920 + 640, 350, 1280, 700));
    }

    #[test]
    fn insets_make_the_visible_frame_hit_the_target() {
        let i = Insets { left: 7, top: 0, right: 7, bottom: 7 };
        let r = apply_insets(Rect::new(0, 0, 960, 1040), i);
        assert_eq!(r, Rect::new(-7, 0, 974, 1047));
    }

    #[test]
    fn appbar_claims_an_edge_strip() {
        let m = Rect::new(0, 0, 1920, 1080);
        assert_eq!(appbar_rect(m, Position::Bottom, 90), Rect::new(0, 990, 1920, 90));
        assert_eq!(appbar_rect(m, Position::Right, 90), Rect::new(1830, 0, 90, 1080));
    }

    #[test]
    fn opacity_is_clamped_and_never_invisible() {
        assert_eq!(opacity_to_alpha(1.0), 255);
        assert_eq!(opacity_to_alpha(0.0), 26);
        assert_eq!(opacity_to_alpha(f64::NAN), 255);
    }
}
