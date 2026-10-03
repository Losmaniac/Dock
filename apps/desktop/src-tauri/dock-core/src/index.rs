//! Bounded file-name index used by the launcher's document search. Plain std: no OS indexing
//! service, no content reading, only names, paths and modification times.
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub mtime: u64,
}

const SKIP_DIRS: &[&str] = &["node_modules", "target", "appdata", "$recycle.bin", "windows", "program files", "program files (x86)", "programdata", "system volume information"];

fn skipped(name: &str) -> bool {
    name.starts_with('.') || name.starts_with('$') || SKIP_DIRS.contains(&name.to_ascii_lowercase().as_str())
}

/// Walks `root` breadth-first up to `max_depth`, stopping once `limit` entries are collected
/// (so a huge tree can never stall the launcher). Hidden and well-known junk directories are skipped.
pub fn walk(root: &Path, max_depth: usize, limit: usize, out: &mut Vec<IndexEntry>) {
    let mut level = vec![root.to_path_buf()];
    for _ in 0..max_depth {
        let mut next = Vec::new();
        for dir in level {
            let Ok(rd) = fs::read_dir(&dir) else { continue };
            for e in rd.flatten() {
                if out.len() >= limit {
                    return;
                }
                let name = e.file_name().to_string_lossy().to_string();
                if skipped(&name) {
                    continue;
                }
                let Ok(md) = e.metadata() else { continue };
                let mtime = md.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
                if md.is_dir() {
                    next.push(e.path());
                }
                out.push(IndexEntry { name, path: e.path().to_string_lossy().to_string(), is_dir: md.is_dir(), mtime });
            }
        }
        level = next;
        if level.is_empty() {
            return;
        }
    }
}

/// Entries whose name contains every whitespace-separated token (case-insensitive), newest first.
pub fn search(entries: &[IndexEntry], query: &str, limit: usize) -> Vec<IndexEntry> {
    let tokens: Vec<String> = query.split_whitespace().map(|t| t.to_lowercase()).collect();
    if tokens.is_empty() {
        return Vec::new();
    }
    let mut hits: Vec<&IndexEntry> = entries
        .iter()
        .filter(|e| {
            let n = e.name.to_lowercase();
            tokens.iter().all(|t| n.contains(t))
        })
        .collect();
    // Names that start with the first token rank first, then recency.
    hits.sort_by(|a, b| {
        let pa = a.name.to_lowercase().starts_with(&tokens[0]);
        let pb = b.name.to_lowercase().starts_with(&tokens[0]);
        pb.cmp(&pa).then(b.mtime.cmp(&a.mtime))
    });
    hits.into_iter().take(limit).cloned().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn e(name: &str, mtime: u64) -> IndexEntry {
        IndexEntry { name: name.into(), path: format!("C:\\{name}"), is_dir: false, mtime }
    }

    #[test]
    fn search_matches_all_tokens_and_ranks_prefix_then_recency() {
        let all = vec![e("old report.docx", 1), e("budget report.xlsx", 9), e("report final.pdf", 5), e("photo.png", 7)];
        let r: Vec<_> = search(&all, "REPORT", 10).into_iter().map(|x| x.name).collect();
        assert_eq!(r, ["report final.pdf", "budget report.xlsx", "old report.docx"]);
        assert_eq!(search(&all, "report xlsx", 10).len(), 1);
        assert!(search(&all, "   ", 10).is_empty());
        assert_eq!(search(&all, "report", 2).len(), 2);
    }

    #[test]
    fn walk_respects_depth_limit_and_skips_junk() {
        let root = std::env::temp_dir().join(format!("gd-index-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("a/b/c")).unwrap();
        fs::create_dir_all(root.join("node_modules/x")).unwrap();
        fs::create_dir_all(root.join(".hidden")).unwrap();
        for p in ["top.txt", "a/mid.txt", "a/b/deep.txt", "a/b/c/deeper.txt", "node_modules/x/n.txt", ".hidden/h.txt"] {
            fs::write(root.join(p), "x").unwrap();
        }
        let mut out = Vec::new();
        walk(&root, 3, 1000, &mut out);
        let names: Vec<_> = out.iter().map(|x| x.name.as_str()).collect();
        assert!(names.contains(&"top.txt") && names.contains(&"mid.txt") && names.contains(&"deep.txt"));
        assert!(!names.contains(&"deeper.txt"), "depth 3 stops before a/b/c");
        assert!(!names.contains(&"n.txt") && !names.contains(&"h.txt"));
        let mut limited = Vec::new();
        walk(&root, 5, 2, &mut limited);
        assert_eq!(limited.len(), 2);
        let _ = fs::remove_dir_all(&root);
    }
}
