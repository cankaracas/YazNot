# Development

## Prerequisites

- Node.js 20 or newer
- Rust 1.77 or newer
- On Windows: Visual Studio C++ build tools and the WebView2 runtime

## First run

```bash
npm ci
npm run setup
```

`npm run setup` creates `ui/config.js` from `ui/config.example.js` when needed
and copies ONNX Runtime Web files from `node_modules` into `ui/stt/`. Both are
ignored by git.

Edit `ui/config.js`:

```js
window.YAZNOT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  // Optional; defaults to https://yaznot.vercel.app/app/
  oauthRedirect: 'https://<your-domain>/app/'
};
```

Then:

```bash
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the desktop app in development mode |
| `npm run build` | Build the Windows installer |
| `npm run build:vercel` | Regenerate the deployable `vercel/` folder |
| `npm run web` | Build the PWA into `dist/pwa` |
| `npm run guide` | Regenerate the in-app guide from `docs/USER-GUIDE.tr.md` |
| `npm test` | Run the automated test suite |
| `npm run test:app` | Optional STT integration test with real model files |
| `npm run icons` | Regenerate application icons from `src-tauri/icons/icon-source.png` |
| `npm run setup` | Recreate local config and runtime assets |

## Repository layout

```
ui/            interface shared by desktop and PWA
web/           PWA manifest, service worker and mobile CSS
src-tauri/     Rust shell and native commands
scripts/       build scripts for PWA, Vercel and the guide
tests/         jsdom-based automated tests
vercel/        landing page source and deployment output
docs/media/    promo video and poster source
docs/          architecture, setup, privacy, user documentation
```

## Configuration and secrets

- `ui/config.js` is ignored. Commit only `ui/config.example.js`.
- Use the Supabase **publishable** key. A `service_role` key must never appear in
  the client.
- Never commit `.env` files, signing keys, model files, or build output.
- The desktop app reads the same configuration file as the PWA build.

## Tests

```bash
npm test
```

The suite covers the UI flows, account vault, email sign-in, PWA packaging,
guide content, Vercel output and the STT core. It uses jsdom and does not need a
real Supabase project or network access.

The optional model test:

```bash
$env:YAZNOT_STT_MODEL_DIR = "C:\path\to\model"
$env:YAZNOT_STT_AUDIO_DIR = "C:\path\to\audio"
npm run test:app
```

It is skipped when the model files or `onnxruntime-web` are missing.

## Guide

The user guide source is `docs/USER-GUIDE.tr.md`. After editing it:

```bash
npm run guide
```

This regenerates `ui/guide-content.js` and `dist/guide-print.html`. The shipped
PDF in `docs/YazNot-Kullanim-Kilavuzu.pdf` is a released artefact; regenerate it
from the print HTML with a browser's "Save as PDF" or with the app's PDF export.

## Web deployment

```bash
npm run build:vercel
```

Upload the contents of `vercel/` to Vercel, or run `npx vercel --prod` inside
that directory. Then add the domain to **Supabase → Authentication → URL
Configuration**:

- Site URL: `https://<domain>/app/`
- Redirect URLs: `https://<domain>/**`

`vercel/app/`, `vercel/kilavuz.pdf`, `vercel/tanitim.mp4`,
`vercel/tanitim-kapak.png` and the installer are generated and ignored by git.
The promo video source lives in `docs/media/` and is copied by
`npm run build:vercel`.

## Windows installer

```bash
npm run build
```

The installer is written to
`src-tauri/target/release/bundle/nsis/YazNot-<version>-x64-setup.exe`. The
current build is unsigned; Windows SmartScreen may show a warning until a code
signing certificate is configured.

## Conventions

- Keep the interface in `ui/` as the single source; do not edit generated files.
- Prefer small, focused changes with a test.
- Use English for code, comments and documentation; the UI text is Turkish.
- Do not add a framework or a bundler without a clear need; the UI is plain
  HTML, CSS and JavaScript by design.
