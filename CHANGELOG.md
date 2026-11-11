# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-11-10

### Added

- Windows desktop application built with Tauri 2 and Rust
- Installable PWA built from the same interface
- Sections, optional groups and rich-text notes
- On-device Turkish/English speech-to-text
- Supabase cloud sync with offline-first local storage
- Multiple accounts with a local session vault
- PDF, TXT and Markdown import/export
- Reading mode, focus mode, dark/light themes and editor width settings
- Trash with 30-day retention, undo and bulk actions
- Daily automatic backups and JSON backup/restore
- In-app user guide and a released PDF version

### Security

- Content Security Policy for the desktop webview
- Path and file-name validation in native commands
- External links restricted to http(s)
- Supabase row-level security documented in `docs/SUPABASE.md`

### Performance

- PDF engine loaded only when needed
- Speech worker released when idle to free model memory
- WebView2 low-memory mode when the window is idle or in the background

### Notes

- The interface is Turkish.
- Windows builds are not code-signed yet.
