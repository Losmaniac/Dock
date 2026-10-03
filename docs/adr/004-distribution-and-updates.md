# ADR 004: Distribution and auto-update

## Decision

- Installers: NSIS (per-user, no admin) and MSI, with the WebView2 bootstrapper embedded.
  Built by the manual `release` workflow; installer size is printed against the 15 MB budget.
- **No auto-update in this version.** Updates are manual downloads.
- Installers are **unsigned** until a code-signing certificate exists (Phase 4 hook below).

## Why

Open decision 4 defaults to "personal use first". Auto-update needs a signing key for update
bundles plus a hosting endpoint, and AGENTS.md requires no network calls without an opt-in.
Adding it before there is a signing identity would ship an unverifiable update channel.

## Revisit when

A public release is planned: add `tauri-plugin-updater` with a minisign key kept in CI
secrets, and sign installers with an Authenticode certificate.
