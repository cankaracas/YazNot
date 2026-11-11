# Roadmap

YazNot 1.0 ships a Windows desktop application and a PWA built from the same
interface. The items below are planned or under consideration; they are not
commitments.

## Platform coverage

- macOS package (DMG) with native PDF export
- Linux packages (AppImage, deb)
- A CI matrix that builds and tests all three desktop platforms

## Distribution

- Code signing for Windows and notarisation for macOS
- Automatic update checks with signed update packages
- Reproducible release builds and checksums

## Performance

- Virtualised lists for very large sections
- Further memory profiling of the WebView2 shell
- Optional native speech-to-text backend for desktop, if it can match the
  current accuracy without a large size increase

## Product

- End-to-end encrypted notes (requires a key-management design)
- Richer Markdown import/export
- Additional languages for the interface

## Contributing

Feature requests and design discussions are welcome in GitHub Issues. Please
open an issue before starting a large change so the approach can be agreed
first.
