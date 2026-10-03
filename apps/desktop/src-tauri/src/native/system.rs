use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub ram_percent: f32,
    pub disk_percent: f32,
    pub net_up_bytes_per_sec: f64,
    pub net_down_bytes_per_sec: f64,
}

struct Sampler {
    sys: System,
    disks: Disks,
    nets: Networks,
    last: Instant,
    tick: u32,
}

static SAMPLER: OnceLock<Mutex<Sampler>> = OnceLock::new();

fn sampler() -> &'static Mutex<Sampler> {
    SAMPLER.get_or_init(|| {
        Mutex::new(Sampler {
            sys: System::new(),
            disks: Disks::new_with_refreshed_list(),
            nets: Networks::new_with_refreshed_list(),
            last: Instant::now(),
            tick: 0,
        })
    })
}

/// Only refreshes what is reported; callers poll at 1 000 ms while the widget is visible.
pub fn stats() -> SystemStats {
    let mut s = sampler().lock().unwrap_or_else(|p| p.into_inner());
    s.sys.refresh_cpu_usage();
    s.sys.refresh_memory();
    s.nets.refresh(true);
    s.tick += 1;
    if s.tick % 10 == 1 {
        s.disks.refresh(true); // disk usage changes slowly
    }
    let secs = s.last.elapsed().as_secs_f64().max(0.001);
    s.last = Instant::now();
    let (rx, tx) = s.nets.iter().fold((0u64, 0u64), |(r, t), (_, n)| (r + n.received(), t + n.transmitted()));
    let total = s.sys.total_memory().max(1);
    let disk = s
        .disks
        .iter()
        .find(|d| d.mount_point().to_string_lossy().to_ascii_uppercase().starts_with("C:"))
        .or_else(|| s.disks.iter().next())
        .map(|d| {
            let t = d.total_space().max(1);
            100.0 * (t - d.available_space()) as f32 / t as f32
        })
        .unwrap_or(0.0);
    SystemStats {
        cpu_percent: s.sys.global_cpu_usage(),
        ram_percent: 100.0 * s.sys.used_memory() as f32 / total as f32,
        disk_percent: disk,
        net_up_bytes_per_sec: tx as f64 / secs,
        net_down_bytes_per_sec: rx as f64 / secs,
    }
}

#[derive(Debug, Serialize)]
pub struct Battery {
    pub percent: u8,
    pub charging: bool,
}

/// `None` on desktops (no battery) or when Windows cannot tell.
pub fn battery() -> Option<Battery> {
    let mut p = SYSTEM_POWER_STATUS::default();
    // SAFETY: valid out pointer.
    unsafe { GetSystemPowerStatus(&mut p).ok()? };
    const NO_BATTERY: u8 = 128;
    const UNKNOWN: u8 = 255;
    if p.BatteryFlag & NO_BATTERY != 0 || p.BatteryLifePercent == UNKNOWN {
        return None;
    }
    Some(Battery { percent: p.BatteryLifePercent, charging: p.ACLineStatus == 1 })
}
