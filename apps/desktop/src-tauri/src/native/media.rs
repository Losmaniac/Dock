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
        Ok(Some(MediaInfo { title: props.Title()?.to_string(), artist: props.Artist()?.to_string(), playing }))
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
