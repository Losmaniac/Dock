//! Master volume and microphone mute through Core Audio (`IAudioEndpointVolume`).
use serde::Serialize;
use windows::core::GUID;
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{
    eCapture, eConsole, eRender, EDataFlow, IMMDeviceEnumerator, MMDeviceEnumerator,
};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED};

use crate::error::{DockError, DockResult};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioState {
    /// 0..1 master output volume.
    pub volume: f32,
    pub muted: bool,
    /// `None` when there is no capture device.
    pub mic_muted: Option<bool>,
}

fn endpoint(flow: EDataFlow) -> windows::core::Result<IAudioEndpointVolume> {
    // SAFETY: COM calls on interfaces created here; apartment init errors are harmless.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let dev = en.GetDefaultAudioEndpoint(flow, eConsole)?;
        dev.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
    }
}

pub fn state() -> DockResult<AudioState> {
    let out = endpoint(eRender)?;
    // SAFETY: valid interface pointers for the duration of the calls.
    unsafe {
        Ok(AudioState {
            volume: out.GetMasterVolumeLevelScalar()?,
            muted: out.GetMute()?.as_bool(),
            mic_muted: endpoint(eCapture).ok().and_then(|m| m.GetMute().ok()).map(|b| b.as_bool()),
        })
    }
}

pub fn set_volume(v: f32) -> DockResult<()> {
    if !v.is_finite() {
        return Err(DockError::InvalidArgument("volume must be a number".into()));
    }
    // SAFETY: valid interface; GUID null = no event context.
    unsafe { endpoint(eRender)?.SetMasterVolumeLevelScalar(v.clamp(0.0, 1.0), &GUID::zeroed())? };
    Ok(())
}

pub fn set_muted(input: bool, muted: bool) -> DockResult<()> {
    let ep = endpoint(if input { eCapture } else { eRender })?;
    // SAFETY: valid interface; GUID null = no event context.
    unsafe { ep.SetMute(muted, &GUID::zeroed())? };
    Ok(())
}
