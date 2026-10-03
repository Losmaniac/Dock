//! Pure config-file rules. The config is opaque JSON to Rust; the frontend validates it
//! with zod. Rust only guarantees: stays inside the app dir, valid JSON, atomic writes,
//! and corrupt files are backed up (never deleted).

pub const MAX_CONFIG_BYTES: usize = 1024 * 1024;

pub fn validate_json(s: &str) -> Result<(), String> {
    if s.len() > MAX_CONFIG_BYTES {
        return Err("config is larger than 1 MB".into());
    }
    serde_json::from_str::<serde_json::Value>(s)
        .map(|_| ())
        .map_err(|e| format!("config is not valid JSON: {e}"))
}

pub fn backup_name(unix_secs: u64) -> String {
    format!("config.bad-{unix_secs}.json")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_garbage_and_oversized() {
        assert!(validate_json("{not json").is_err());
        assert!(validate_json(&" ".repeat(MAX_CONFIG_BYTES + 1)).is_err());
        assert!(validate_json("{\"version\":1}").is_ok());
    }

    #[test]
    fn backup_name_is_timestamped() {
        assert_eq!(backup_name(5), "config.bad-5.json");
    }
}
