use serde::Serialize;

// Variants are constructed by the Phase 1+ commands; the type is the contract from day one.
#[allow(dead_code)]
/// Serialized to the frontend as `{ code, message }` (mirrors `DockError` in packages/shared).
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
pub enum DockError {
    #[error("{0}")]
    InvalidArgument(String),
    #[error("{0}")]
    NotSupported(String),
    #[error("{0}")]
    OsError(String),
}

pub type DockResult<T> = Result<T, DockError>;
