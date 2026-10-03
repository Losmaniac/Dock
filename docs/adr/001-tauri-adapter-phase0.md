# ADR 001: Phase 0 TauriAdapter delegates rendering data to the mock

## Context

Phase 0 needs the desktop shell to show the same dock as the web build, but window
enumeration, icon extraction, and config persistence are Phase 1 work.

## Decision

`TauriAdapter` implements only `setBlurMode` natively. `listWindows`, `getIcon`,
`loadConfig`, and `saveConfig` delegate to an internal `MockAdapter` so the shell can
render. Every other method rejects with a typed `not_implemented` error naming its phase.

## Consequences

- The desktop dock shows fake windows and icons until Phase 1. This is deliberate and
  must be removed when the Rust commands land.
- Nothing silently pretends to work: unimplemented actions fail loudly.
