use std::path::Path;
use std::process::Command;

use dock_core::validate;
use serde::{Deserialize, Serialize};
use windows::core::{HSTRING, PCWSTR};
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

use crate::error::{DockError, DockResult};
use crate::native::{icons, shortcut};

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum LaunchItem {
    App { path: String, #[serde(default)] args: Vec<String> },
    Folder { path: String },
    File { path: String },
    Url { url: String },
    Uwp { aumid: String },
    /// `ms-settings:<page>`; an empty page opens Windows Settings.
    Settings { #[serde(default)] page: String },
}

fn shell_open(target: &str) -> DockResult<()> {
    // SAFETY: strings outlive the call; ShellExecuteW returns a value > 32 on success.
    let r = unsafe {
        ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(target), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL)
    };
    if r.0 as usize > 32 { Ok(()) } else { Err(DockError::OsError(format!("could not open {target}"))) }
}

fn checked_path(p: &str, want_dir: bool) -> DockResult<()> {
    if !validate::is_plain_absolute_windows_path(p) {
        return Err(DockError::InvalidArgument(format!("not an absolute path: {p}")));
    }
    let path = Path::new(p);
    let ok = if want_dir { path.is_dir() } else { path.is_file() };
    if ok { Ok(()) } else { Err(DockError::InvalidArgument(format!("not found: {p}"))) }
}

/// Apps are started with an argument array (no shell string concatenation).
#[tauri::command(async)]
pub fn launch(item: LaunchItem) -> DockResult<()> {
    match item {
        LaunchItem::App { path, args } => {
            checked_path(&path, false)?;
            let is_exe = path.to_ascii_lowercase().ends_with(".exe");
            if is_exe {
                let mut cmd = Command::new(&path);
                cmd.args(&args);
                if let Some(dir) = Path::new(&path).parent() {
                    cmd.current_dir(dir);
                }
                cmd.spawn()?;
                Ok(())
            } else if args.is_empty() {
                shell_open(&path) // .lnk, .bat, documents
            } else {
                Err(DockError::InvalidArgument("arguments are only supported for .exe items".into()))
            }
        }
        LaunchItem::Folder { path } => {
            checked_path(&path, true)?;
            shell_open(&path)
        }
        LaunchItem::File { path } => {
            checked_path(&path, false)?;
            shell_open(&path)
        }
        LaunchItem::Url { url } => {
            if !validate::is_allowed_url(&url) {
                return Err(DockError::InvalidArgument("only http, https and mailto links can be opened".into()));
            }
            shell_open(url.trim())
        }
        LaunchItem::Settings { page } => {
            if !validate::is_valid_settings_page(&page) {
                return Err(DockError::InvalidArgument("invalid settings page".into()));
            }
            shell_open(&format!("ms-settings:{page}"))
        }
        LaunchItem::Uwp { aumid } => {
            if !validate::is_valid_aumid(&aumid) {
                return Err(DockError::InvalidArgument("invalid app id".into()));
            }
            Command::new("explorer.exe").arg(format!("shell:AppsFolder\\{aumid}")).spawn()?;
            Ok(())
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum IconSource {
    Path { path: String },
    Aumid { aumid: String },
}

#[tauri::command(async)]
pub fn get_icon(source: IconSource) -> DockResult<String> {
    match source {
        IconSource::Path { path } => {
            if !validate::is_plain_absolute_windows_path(&path) {
                return Err(DockError::InvalidArgument(format!("not an absolute path: {path}")));
            }
            icons::icon_data_url(&path, false)
        }
        IconSource::Aumid { aumid } => {
            if !validate::is_valid_aumid(&aumid) {
                return Err(DockError::InvalidArgument("invalid app id".into()));
            }
            icons::icon_data_url(&aumid, true)
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathInfo {
    pub kind: &'static str, // "app" | "folder" | "file"
    pub label: String,
    pub path: String,
    pub args: Vec<String>,
}

/// Classifies a dropped path and resolves `.lnk` shortcuts to their target.
#[tauri::command(async)]
pub fn describe_path(path: String) -> DockResult<PathInfo> {
    if !validate::is_plain_absolute_windows_path(&path) {
        return Err(DockError::InvalidArgument(format!("not an absolute path: {path}")));
    }
    let p = Path::new(&path);
    let label = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| path.clone());
    if p.is_dir() {
        return Ok(PathInfo { kind: "folder", label, path, args: vec![] });
    }
    if !p.is_file() {
        return Err(DockError::InvalidArgument(format!("not found: {path}")));
    }
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".lnk") {
        let r = shortcut::resolve(&path)?;
        if Path::new(&r.target).is_dir() {
            return Ok(PathInfo { kind: "folder", label, path: r.target, args: vec![] });
        }
        if !r.target.is_empty() {
            return Ok(PathInfo { kind: "app", label, path: r.target, args: r.args });
        }
        return Ok(PathInfo { kind: "app", label, path, args: vec![] }); // UWP shortcut: keep the .lnk
    }
    let kind = if lower.ends_with(".exe") { "app" } else { "file" };
    Ok(PathInfo { kind, label, path, args: vec![] })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

/// Folder "stack" contents: folders first, then files, hidden/system entries skipped, capped.
#[tauri::command(async)]
pub fn list_folder(path: String) -> DockResult<Vec<FolderEntry>> {
    use std::os::windows::fs::MetadataExt;
    checked_path(&path, true)?;
    const HIDDEN_SYSTEM: u32 = 0x2 | 0x4;
    let mut out: Vec<FolderEntry> = std::fs::read_dir(&path)?
        .flatten()
        .filter_map(|e| {
            let md = e.metadata().ok()?;
            if md.file_attributes() & HIDDEN_SYSTEM != 0 {
                return None;
            }
            Some(FolderEntry {
                name: e.file_name().to_string_lossy().to_string(),
                path: e.path().to_string_lossy().to_string(),
                is_dir: md.is_dir(),
            })
        })
        .collect();
    out.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    out.truncate(60);
    Ok(out)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocHit {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command(async)]
pub fn get_start_apps() -> Vec<crate::native::catalog::StartApp> {
    crate::native::catalog::start_apps()
}

#[tauri::command(async)]
pub fn get_recent_files() -> DockResult<Vec<crate::native::catalog::RecentFile>> {
    crate::native::catalog::recent_files()
}

#[tauri::command(async)]
pub fn search_documents(query: String) -> Vec<DocHit> {
    crate::native::catalog::search_documents(&query)
        .into_iter()
        .map(|e| DocHit { name: e.name, path: e.path, is_dir: e.is_dir })
        .collect()
}
