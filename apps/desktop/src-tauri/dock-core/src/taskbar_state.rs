//! Persisted record of "the dock hid the Windows taskbar", used to undo it after a crash.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarState {
    pub hidden: bool,
    /// Taskbar app-bar state flags before we touched them (bit 0 = auto-hide, bit 1 = always on top).
    pub prev_flags: u32,
    /// Process that hid it.
    pub pid: u32,
}

pub fn parse(s: &str) -> Option<TaskbarState> {
    serde_json::from_str(s).ok()
}

pub fn serialize(s: &TaskbarState) -> String {
    serde_json::to_string(s).unwrap_or_default()
}

/// A leftover record needs recovery when it says "hidden" and its owner process is gone.
pub fn needs_recovery(s: &TaskbarState, owner_alive: bool) -> bool {
    s.hidden && !owner_alive
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_rejects_garbage() {
        let s = TaskbarState { hidden: true, prev_flags: 2, pid: 42 };
        assert_eq!(parse(&serialize(&s)), Some(s));
        assert_eq!(parse("nope"), None);
        assert_eq!(parse("{}"), None);
    }

    #[test]
    fn only_a_dead_owner_triggers_recovery() {
        let s = TaskbarState { hidden: true, prev_flags: 0, pid: 1 };
        assert!(needs_recovery(&s, false));
        assert!(!needs_recovery(&s, true));
        assert!(!needs_recovery(&TaskbarState { hidden: false, ..s }, false));
    }
}
