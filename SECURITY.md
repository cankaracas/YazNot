# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's **Report a vulnerability** button on the repository's Security tab
(private security advisory). If that option is not available, open a short issue
asking the maintainers for a private channel; do not include vulnerability
details, credentials or personal data in a public issue.

Include:

- the affected version and platform,
- steps to reproduce,
- the impact you believe it has,
- any suggested fix or mitigation.

Reports are reviewed on a best-effort basis. There is no bug bounty programme.

## Scope

In scope:

- the Tauri desktop shell and its native commands (`src-tauri/`),
- the web interface and PWA (`ui/`, `web/`),
- the Supabase schema and row-level security rules documented in
  `docs/SUPABASE.md`,
- the build scripts and deployment folder generator.

Out of scope:

- vulnerabilities in Supabase, WebView2, ONNX Runtime, or other third-party
  components (report them upstream),
- issues that require a compromised device or an already compromised Supabase
  project,
- denial of service through deliberately malformed local files.

## Handling of secrets

- The client uses the Supabase **publishable** key, which is designed to be
  public. Data isolation depends on row-level security.
- A `service_role` key must never be committed or shipped in a client.
- `ui/config.js`, environment files, signing keys and build output are ignored
  by git. See `.gitignore`.
- If a secret is committed by mistake, rotate it first and then remove it from
  the repository history.

## Security measures in the client

- Tauri runs the interface without Node.js integration; native capabilities are
  exposed through a fixed command list.
- The desktop WebView applies a Content Security Policy that limits scripts,
  Workers and network destinations.
- Native commands validate file keys and names before accessing the filesystem,
  and only open http(s) URLs externally.
- Google sign-in runs in a dedicated in-app window and captures the custom
  `yaznot://auth` redirect locally.
- The app has no telemetry or third-party analytics.
