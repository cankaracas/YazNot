# Contributing

Thanks for taking the time to improve YazNot.

## Before you start

- For a bug, open an issue with the version, platform and reproduction steps.
- For a large feature or a refactor, open an issue first so the approach can be
  agreed before code is written.
- For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a
  public issue.

## Development setup

```bash
npm ci
npm run setup
npm run dev
```

`npm run setup` creates `ui/config.js` and copies ONNX Runtime Web files into
`ui/stt/`. Both are ignored by git. Fill in your own Supabase values as
described in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Tests

Run the suite before opening a pull request:

```bash
npm test
```

The tests do not need a live Supabase project. For the optional STT integration
test, see [docs/STT.md](docs/STT.md).

## Code style

- The interface is plain HTML, CSS and JavaScript. Do not introduce a framework
  or bundler without a clear need.
- Use two spaces in JavaScript, JSON, HTML and CSS; four spaces in Rust.
- Keep comments in English and only where they explain a decision that the code
  cannot show.
- UI text is Turkish. Documentation and commit messages are English.
- Do not edit generated files: `ui/guide-content.js`, `dist/`, `vercel/app/` and
  the installer are produced by scripts.

## Pull requests

- Keep the change focused; one concern per pull request.
- Add or update tests for behaviour changes.
- Describe what changed, why, and how you verified it.
- Do not commit `ui/config.js`, `.env` files, service-role keys, model files,
  build output or personal data.
- Run `npm test` and include the result in the pull request description.

## Commit messages

Use the imperative mood in the subject line, for example:

```
Add Markdown table import
Fix backup path on Windows
```

Keep the subject under about 72 characters. Add a body when the reason is not
obvious.

## Licence

By contributing, you agree that your contribution is licensed under the MIT
licence of this project.
