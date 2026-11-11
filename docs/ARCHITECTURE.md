# Architecture

YazNot is a single-page web application wrapped in a Tauri desktop shell. The
same interface is also built as a PWA. This document describes the runtime
pieces, the native bridge and the data model.

## Runtime overview

```
┌──────────────────────────── desktop ────────────────────────────┐
│ Tauri (Rust)                                                    │
│  ├─ window, single instance, window state, memory policy        │
│  ├─ native commands (files, backups, PDF, OAuth, external URLs) │
│  └─ WebView2                                                    │
│       └─ ui/  (HTML, CSS and JavaScript)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────── browser / PWA ───────────────────────┐
│ Service worker + Cache Storage                                  │
│  └─ ui/ + web/                                                  │
└─────────────────────────────────────────────────────────────────┘
```

`ui/` is the only source for application screens. `web/` adds the manifest,
service worker and mobile styles for the browser build. The desktop build reads
`ui/` directly through `frontendDist`.

## Native bridge

`ui/platform.js` exposes `window.yaznotNative` when running inside the desktop
shell. In a browser the object is `null` and `ui/cloud-api.js` uses its web
fallbacks (file input, download links, print dialog).

| JavaScript | Rust command | Purpose |
|---|---|---|
| `loadLegacy(key)` | `load_legacy` | Read a JSON file from the previous file-based storage |
| `pickImage()` | `pick_image` | Native image picker, returns a data URL |
| `exportBackup(payload)` | `export_backup` | Save a JSON backup |
| `importBackup(path?)` | `import_backup` | Open a backup, optionally from a known path |
| `findBackups()` | `find_backups` | Find recent backups in Downloads/Desktop |
| `autoBackup(payload)` | `auto_backup` | Daily backup, last seven per account |
| `openBackupsFolder()` | `open_backups_folder` | Open the backup directory |
| `confirm(opts)` | `confirm` | Native confirmation dialog |
| `googleSignIn(url)` | `google_sign_in` | In-app Google OAuth window and `yaznot://auth` capture |
| `saveTextFile(title, text, ext)` | `save_text_file` | TXT/Markdown/HTML export with BOM |
| `exportPdf(title, html)` | `export_pdf` | Render HTML to PDF through WebView2 |
| `saveGuidePdf()` | `save_guide_pdf` | Copy the bundled user guide PDF |
| `openExternal(url)` | `open_external` | Open an http(s) URL in the system browser |
| `setMemoryLevel(low)` | `set_memory_level` | Ask WebView2 to release caches when idle |

`export_pdf` uses the Windows WebView2 print pipeline. On platforms without a native renderer, the interface falls back to the system print dialog.

Native commands validate paths and keys before touching the filesystem. Keys
must match `[A-Za-z0-9_-]{1,64}`; file names are sanitised.

All commands are additionally restricted to the `main` window. OAuth and PDF
helper windows can load remote or generated HTML, so they are not allowed to
call native commands.

## Data model

All notes are kept in one JSON document under the `sections` key:

```js
sections: [
  {
    id, name, icon, color,
    type: 'list' | 'grid',
    structure: 'flat' | 'grouped',
    sortOrder,
    items:  [{ id, title, content /* HTML */, createdAt, updatedAt }],
    groups: [{ id, name, sortOrder, items: [...] }]
  }
]
```

Deleted records live under `trash` with their original location and deletion
time. Records older than 30 days are removed.

## Storage and sync

- **Local cache:** IndexedDB database `yaznot`, store `kv`. Keys are scoped by
  account (`u/<user-id>/sections`, `u/<user-id>/trash`), so accounts never read
  each other's data.
- **Settings:** stored on the device, scoped to the active account.
- **Cloud:** Supabase table `kv_store` (`user_id`, `key`, `value` JSONB) with
  row-level security. Each account can only read and write its own rows.
- **Sessions:** each Supabase session is kept under its own localStorage key.
  Switching accounts changes the active key and reloads the page; no email code
  is requested again.
- **Offline:** every write goes to IndexedDB first. If the cloud call fails, the
  key is marked dirty and retried when the browser reports connectivity, on a
  periodic timer, and on the next load. Pending local changes win over an older
  cloud copy to avoid data loss.
- **Backups:** on Windows, one automatic JSON snapshot per account per day is
  written to `%APPDATA%\YazNot\backups`; the last seven snapshots are kept.

## Speech-to-text

The model is not bundled. On first use, the app downloads the int8 Duyu-small
model (about 56 MB, eight files) and verifies size and SHA-256 for each file.
Files are kept in Cache Storage and remain available offline.

Feature extraction, SentencePiece, CTC/beam search and model orchestration run
in a dedicated Web Worker using ONNX Runtime Web (WASM). Audio is decoded to
16 kHz mono, split into 25-second chunks and processed locally. The worker is
released after the panel is closed (or after a period of inactivity) so the
model does not stay resident.

## Security

- Rust commands only accept http/https external URLs and validated local paths.
- The desktop app runs without Node.js integration in the WebView; the bridge
  is an explicit command list.
- Google sign-in uses an in-app window and captures the `yaznot://auth`
  redirect before the URL leaves the app.
- The desktop WebView applies a Content Security Policy that restricts scripts
  to local files, Workers to `self`/`blob:` and network requests to the
  configured Supabase project and the model host.
- Supabase access uses the publishable key; row-level security enforces
  per-user isolation. Service-role keys are never shipped.
- No telemetry or analytics SDK is included.

## Performance and memory

- The PDF engine is loaded only when a PDF is imported, then its document and
  worker are destroyed.
- WebView2 is switched to its low-memory target level when the window is in the
  background or idle, and back to normal on the next interaction.
- Native GPU compositing is kept enabled: disabling it reduces memory but makes
  scrolling several times slower.
- The desktop window restores its size and position between runs.

## Build outputs

| Command | Output |
|---|---|
| `npm run build` | Windows NSIS installer under `src-tauri/target/release/bundle/nsis/` |
| `npm run build:vercel` | Deployable `vercel/` folder (landing, PWA, guide PDF, installer) |
| `npm run web` | `dist/pwa` only |
| `npm run guide` | `ui/guide-content.js` and `dist/guide-print.html` |
