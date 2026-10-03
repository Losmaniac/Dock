//! Launcher data: Start Menu apps with categories, Store apps, recent files, document index.
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant, UNIX_EPOCH};

use dock_core::index::{self, IndexEntry};
use serde::Serialize;

use crate::error::DockResult;
use crate::native::shortcut;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartApp {
    pub name: String,
    /// `.lnk` path for classic apps.
    pub path: Option<String>,
    /// AppUserModelID for Store apps.
    pub aumid: Option<String>,
    pub category: String,
}

static APPS: Mutex<Option<(Instant, Vec<StartApp>)>> = Mutex::new(None);

fn start_menu_roots() -> Vec<PathBuf> {
    ["ProgramData", "APPDATA"]
        .iter()
        .filter_map(|v| std::env::var_os(v))
        .map(|b| PathBuf::from(b).join("Microsoft/Windows/Start Menu/Programs"))
        .collect()
}

fn scan_lnk(root: &Path, dir: &Path, depth: usize, out: &mut Vec<StartApp>) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() && depth < 3 {
            scan_lnk(root, &p, depth + 1, out);
        } else if p.extension().is_some_and(|x| x.eq_ignore_ascii_case("lnk")) {
            let name = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            let lower = name.to_lowercase();
            if name.is_empty() || lower.contains("uninstall") || lower.contains("readme") || lower.starts_with("help") {
                continue;
            }
            // First folder under "Programs" is the category; shortcuts at the top level are "Apps".
            let category = p
                .strip_prefix(root)
                .ok()
                .and_then(|r| r.components().next())
                .filter(|_| p.parent() != Some(root))
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .unwrap_or_else(|| "Apps".into());
            out.push(StartApp { name, path: Some(p.to_string_lossy().to_string()), aumid: None, category });
        }
    }
}

/// Store apps via the supported `Get-StartApps` cmdlet. The command text is fixed (no user input).
fn store_apps() -> Vec<StartApp> {
    let script = "Get-StartApps | Where-Object { $_.AppID -like '*!*' } | ForEach-Object { $_.Name + '|' + $_.AppID }";
    let Ok(out) = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    else {
        return Vec::new();
    };
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter_map(|l| {
            let (name, id) = l.trim().rsplit_once('|')?;
            dock_core::validate::is_valid_aumid(id).then(|| StartApp {
                name: name.to_string(),
                path: None,
                aumid: Some(id.to_string()),
                category: "Store apps".into(),
            })
        })
        .collect()
}

pub fn start_apps() -> Vec<StartApp> {
    let mut guard = APPS.lock().unwrap_or_else(|p| p.into_inner());
    if let Some((at, apps)) = guard.as_ref() {
        if at.elapsed() < Duration::from_secs(300) {
            return apps.clone();
        }
    }
    let mut apps = Vec::new();
    for root in start_menu_roots() {
        scan_lnk(&root, &root, 0, &mut apps);
    }
    apps.extend(store_apps());
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name.eq_ignore_ascii_case(&b.name));
    *guard = Some((Instant::now(), apps.clone()));
    apps
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

pub fn recent_files() -> DockResult<Vec<RecentFile>> {
    let Some(base) = std::env::var_os("APPDATA") else { return Ok(Vec::new()) };
    let dir = PathBuf::from(base).join("Microsoft/Windows/Recent");
    let mut links: Vec<(u64, PathBuf)> = fs::read_dir(dir)?
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x.eq_ignore_ascii_case("lnk")))
        .filter_map(|e| {
            let t = e.metadata().ok()?.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs();
            Some((t, e.path()))
        })
        .collect();
    links.sort_by(|a, b| b.0.cmp(&a.0));
    let mut out = Vec::new();
    for (_, lnk) in links.into_iter().take(80) {
        if out.len() >= 30 {
            break;
        }
        let Ok(r) = shortcut::resolve(&lnk.to_string_lossy()) else { continue };
        let target = Path::new(&r.target);
        if r.target.is_empty() || !target.exists() {
            continue;
        }
        out.push(RecentFile {
            name: target.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
            path: r.target.clone(),
            is_dir: target.is_dir(),
        });
    }
    Ok(out)
}

static INDEX: Mutex<(Option<Instant>, Vec<IndexEntry>, bool)> = Mutex::new((None, Vec::new(), false));

fn rebuild_index() {
    let Some(home) = std::env::var_os("USERPROFILE").map(PathBuf::from) else {
        INDEX.lock().unwrap_or_else(|p| p.into_inner()).2 = false; // allow a later retry
        return;
    };
    let mut entries = Vec::new();
    for sub in ["Documents", "Desktop", "Downloads", "Pictures", "Music", "Videos"] {
        index::walk(&home.join(sub), 5, 60_000, &mut entries);
    }
    let mut g = INDEX.lock().unwrap_or_else(|p| p.into_inner());
    *g = (Some(Instant::now()), entries, false);
}

/// Searches the cached index; (re)builds it in the background when missing or older than 5 min.
pub fn search_documents(query: &str) -> Vec<IndexEntry> {
    let mut g = INDEX.lock().unwrap_or_else(|p| p.into_inner());
    let stale = g.0.map_or(true, |t| t.elapsed() > Duration::from_secs(300));
    if stale && !g.2 {
        g.2 = true;
        std::thread::spawn(rebuild_index);
    }
    index::search(&g.1, query, 40)
}
