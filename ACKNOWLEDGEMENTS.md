# Acknowledgements

YazNot is built on work that other people chose to share. Thank you.

## Duyu-small

The on-device speech-to-text engine uses **Duyu-small**, an open speech model
created by **Kaan Aydınlı** and released under the **Apache-2.0** licence.

- Model: Duyu-small, int8 ONNX build
- Author: Kaan Aydınlı
- Source: https://huggingface.co/KaanAydinli/Duyu-small
- Licence: Apache-2.0
- Used for: local Turkish/English speech-to-text in the desktop and web builds

The model is not bundled with this repository. The application downloads it at
first use and verifies each file. YazNot is an independent project and is not
affiliated with or endorsed by the model author.

## Open-source software

YazNot would not be this small, quiet or local without these projects:

- [Tauri](https://tauri.app/) — desktop shell
- [ONNX Runtime](https://onnxruntime.ai/) — on-device model runtime
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF import
- [Supabase](https://supabase.com/) — authentication and sync primitives
- [jsdom](https://github.com/jsdom/jsdom) — test environment

Their licences are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## A note to developers

If you maintain an open-source library, publish a model card, write a clear
README, or answer a stranger's issue: thank you. This project exists because
people before us documented their work and left the door open.

If you build something with YazNot, you are welcome to do the same.
