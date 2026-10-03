use serde::Serialize;

/// Serialized to the frontend as `{ code, message }` (mirrors `DockError` in packages/shared).
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
#[allow(dead_code)] // NotSupported is used by Phase 4 experiments
pub enum DockError {
    #[error("{0}")]
    InvalidArgument(String),
    #[error("{0}")]
    NotSupported(String),
    #[error("{0}")]
    AccessDenied(String),
    #[error("{0}")]
    OsError(String),
}

pub type DockResult<T> = Result<T, DockError>;

impl From<std::io::Error> for DockError {
    fn from(e: std::io::Error) -> Self {
        DockError::OsError(e.to_string())
    }
}

#[cfg(windows)]
impl From<windows::core::Error> for DockError {
    fn from(e: windows::core::Error) -> Self {
        DockError::OsError(e.to_string())
    }
}

impl From<tauri::Error> for DockError {
    fn from(e: tauri::Error) -> Self {
        DockError::OsError(e.to_string())
    }
}
