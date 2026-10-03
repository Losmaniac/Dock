//! Config + cache live in `%APPDATA%\GlassDock`. Nothing is ever written outside it.
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use dock_core::cfgfile;

use crate::error::{DockError, DockResult};

pub fn app_dir() -> DockResult<PathBuf> {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| DockError::OsError("APPDATA is not set".into()))?;
    let dir = base.join("GlassDock");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn cache_dir(name: &str) -> DockResult<PathBuf> {
    let dir = app_dir()?.join("cache").join(name);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn config_path() -> DockResult<PathBuf> {
    Ok(app_dir()?.join("config.json"))
}

/// Raw JSON text, or `None` on first run. The frontend validates it with zod.
#[tauri::command]
pub fn load_config() -> DockResult<Option<String>> {
    match fs::read_to_string(config_path()?) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Atomic write: temp file in the same directory, then rename over the target.
#[tauri::command]
pub fn save_config(json: String) -> DockResult<()> {
    cfgfile::validate_json(&json).map_err(DockError::InvalidArgument)?;
    let path = config_path()?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json)?;
    fs::rename(&tmp, &path)?;
    Ok(())
}

/// Copies the current config aside (never deletes it). Returns the backup file name.
#[tauri::command]
pub fn backup_corrupt_config() -> DockResult<Option<String>> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let name = cfgfile::backup_name(secs);
    fs::copy(&path, path.with_file_name(&name))?;
    Ok(Some(name))
}
