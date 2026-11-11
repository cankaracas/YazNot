# Deployment folder

This directory is the root of the Vercel project and the public landing page.
It is deployed as a static site from the GitHub repository.

The generated files in this folder are tracked so a Git push is enough to
publish:

- `app/` — the installable PWA
- `kilavuz.pdf`, `kilavuz-en.pdf` — Turkish and English user guides
- `tanitim.mp4`, `tanitim-en.mp4` — the Turkish and English films
- `tanitim-kapak.png`, `tanitim-en-kapak.png` — their posters
- `YazNot-Setup-*.exe` — the Windows installer

Regenerate them with:

```bash
npm run build:vercel
```

Vercel uses this folder as the project root, so there is no build step on the
host. See [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) for the full release
steps.
