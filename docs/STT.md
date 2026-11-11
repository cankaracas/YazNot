# On-device speech-to-text

YazNot converts Turkish and English speech to text locally. Audio is never
uploaded; only the model files are downloaded once.

## Model

- **Model:** Duyu-small, int8 quantised ONNX build
- **Source:** https://huggingface.co/KaanAydinli/Duyu-small
- **Size:** about 56 MB across eight files
- **Languages:** Turkish, English, or automatic mixed mode
- **Licence:** Apache-2.0 (see the model card)

The model is not bundled with the application. On first use the app downloads
the files, verifies each file's size and SHA-256, then stores them in Cache
Storage under `yaznot-stt-duyu-small-int8-v1`. Later runs work offline and an
application update does not remove the model.

## Pipeline

1. Audio is decoded to 16 kHz mono (microphone recording up to 2 minutes, file
   upload up to 5 minutes).
2. Audio is split into 25-second chunks.
3. A Web Worker runs feature extraction (fbank/mel), the encoder passes, the CTC
   head and a beam-search decoder through ONNX Runtime Web (WASM).
4. Chunk results are joined and shown in the editor for review before insertion.

Beam width is 5 on desktop and 4 on mobile. The worker is terminated when the
speech panel is closed (or after a period of inactivity) to release model and
runtime memory; the cached model files stay on disk.

## Files

| File | Purpose |
|---|---|
| `ui/stt/ds-core.js` | Feature extraction, SentencePiece, CTC and beam search |
| `ui/stt/ds-worker.js` | Worker entry point and ONNX sessions |
| `ui/stt/stt-app.js` | Panel, recording, file input, download and cache |
| `ui/stt/ort*.js/.mjs/.wasm` | ONNX Runtime Web, copied by `npm run setup` |

The ONNX Runtime files are fetched from the `onnxruntime-web` npm package into
`ui/stt/`; they are not committed to git.

## Tests

`npm test` covers the core without model files: SentencePiece, NPY parsing, CTC
greedy/beam search, chunking and guards.

The optional integration test uses the real model and audio:

```bash
$env:YAZNOT_STT_MODEL_DIR = "C:\path\to\model"
$env:YAZNOT_STT_AUDIO_DIR = "C:\path\to\audio"
npm run test:app
```

The test is skipped when the model or `onnxruntime-web` is not available.

## Credits

Duyu-small was created by **Kaan Aydınlı** and is released under the
**Apache-2.0** licence: https://huggingface.co/KaanAydinli/Duyu-small

The model is downloaded at runtime and is not bundled with this repository.
YazNot is independent and is not affiliated with or endorsed by the model
author. Thank you to Kaan Aydınlı and to the ONNX Runtime, SentencePiece and
open-source speech communities whose work made this possible.

## Privacy

Recordings, uploaded audio and transcripts remain on the device. The only
network request is the one-time model download from Hugging Face.
