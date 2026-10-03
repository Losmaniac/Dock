//! Pure icon-cache naming. The mtime is part of the file name, so a modified executable
//! naturally misses the cache; stale siblings are found by prefix and removed.

/// FNV-1a 64-bit. Stable across Rust versions (unlike `DefaultHasher`).
pub fn fnv1a(s: &str) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.to_lowercase().bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

pub fn prefix(source: &str) -> String {
    format!("{:016x}-", fnv1a(source))
}

pub fn cache_file_name(source: &str, mtime_secs: u64, size: u32) -> String {
    format!("{}{}-{}.png", prefix(source), mtime_secs, size)
}

pub fn is_stale_sibling(file_name: &str, source: &str, current: &str) -> bool {
    file_name != current && file_name.starts_with(&prefix(source))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_is_case_insensitive_and_stable() {
        assert_eq!(fnv1a("C:\\A\\B.exe"), fnv1a("c:\\a\\b.exe"));
        assert_eq!(fnv1a(""), 0xcbf29ce484222325);
    }

    #[test]
    fn modification_changes_the_file_name() {
        assert_ne!(cache_file_name("a.exe", 1, 256), cache_file_name("a.exe", 2, 256));
    }

    #[test]
    fn stale_siblings_are_detected_but_not_the_current_file_or_others() {
        let cur = cache_file_name("a.exe", 2, 256);
        let old = cache_file_name("a.exe", 1, 256);
        let other = cache_file_name("b.exe", 1, 256);
        assert!(is_stale_sibling(&old, "a.exe", &cur));
        assert!(!is_stale_sibling(&cur, "a.exe", &cur));
        assert!(!is_stale_sibling(&other, "a.exe", &cur));
    }
}
