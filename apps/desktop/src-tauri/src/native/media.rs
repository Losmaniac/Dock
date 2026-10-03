//! Now playing + transport controls through Windows SMTC. WinRT async calls are awaited on a
//! short-lived MTA thread so they can never deadlock a COM single-threaded apartment.
use serde::Serialize;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager as Manager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

use crate::error::{DockError, DockResult};

#[derive(Debug, Serialize)]
pub struct MediaInfo {
    pub title: String,
    pub artist: String,
    pub playing: bool,
    pub position_ms: i64,
    pub duration_ms: i64,
}

fn on_mta<T: Send + 'static>(f: impl FnOnce() -> windows::core::Result<T> + Send + 'static) -> DockResult<T> {
    std::thread::spawn(move || {
        // SAFETY: first COM call on a brand-new thread.
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        f()
    })
    .join()
    .map_err(|_| DockError::OsError("media thread panicked".into()))?
    .map_err(Into::into)
}

pub fn now_playing() -> DockResult<Option<MediaInfo>> {
    on_mta(|| {
        let mgr = Manager::RequestAsync()?.join()?;
        let Ok(session) = mgr.GetCurrentSession() else { return Ok(None) };
        let props = session.TryGetMediaPropertiesAsync()?.join()?;
        let playing = session.GetPlaybackInfo()?.PlaybackStatus()? == Status::Playing;
        let (mut position_ms, mut duration_ms) = (0, 0);
        if let Ok(t) = session.GetTimelineProperties() {
            // TimeSpan is in 100 ns ticks.
            position_ms = t.Position().map(|p| p.Duration / 10_000).unwrap_or(0);
            duration_ms = t.EndTime().map(|p| p.Duration / 10_000).unwrap_or(0);
        }
        Ok(Some(MediaInfo { title: props.Title()?.to_string(), artist: props.Artist()?.to_string(), playing, position_ms, duration_ms }))
    })
}

pub fn control(action: &str) -> DockResult<()> {
    let action = action.to_string();
    on_mta(move || {
        let mgr = Manager::RequestAsync()?.join()?;
        let session = mgr.GetCurrentSession()?;
        match action.as_str() {
            "play-pause" => session.TryTogglePlayPauseAsync()?.join()?,
            "next" => session.TrySkipNextAsync()?.join()?,
            "previous" => session.TrySkipPreviousAsync()?.join()?,
            _ => false,
        };
        Ok(())
    })
}

/// Album art of the current session as a data URL (None when the app provides none).
pub fn cover() -> DockResult<Option<String>> {
    use windows::Storage::Streams::DataReader;
    on_mta(|| {
        let mgr = Manager::RequestAsync()?.join()?;
        let Ok(session) = mgr.GetCurrentSession() else { return Ok(None) };
        let props = session.TryGetMediaPropertiesAsync()?.join()?;
        let Ok(thumb) = props.Thumbnail() else { return Ok(None) };
        let stream = thumb.OpenReadAsync()?.join()?;
        let size = stream.Size()? as u32;
        if size == 0 || size > 8 * 1024 * 1024 {
            return Ok(None);
        }
        let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0)?)?;
        reader.LoadAsync(size)?.join()?;
        let mut bytes = vec![0u8; size as usize];
        reader.ReadBytes(&mut bytes)?;
        let mime = stream.ContentType().map(|c| c.to_string()).unwrap_or_default();
        let mime = if mime.starts_with("image/") { mime } else { "image/jpeg".to_string() };
        Ok(Some(format!("data:{mime};base64,{}", dock_core::b64::encode(&bytes))))
    })
}
