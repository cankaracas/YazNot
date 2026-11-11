/**
 * Prepares local runtime assets that are not committed to the repository.
 *
 *   1. Creates ui/config.js from ui/config.example.js when it is missing.
 *   2. Copies ONNX Runtime Web files from node_modules into ui/stt/.
 *
 * Run automatically by npm (predev, prebuild, pretest) or manually:
 *   npm run setup
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI = path.join(ROOT, 'ui');
const CONFIG = path.join(UI, 'config.js');
const CONFIG_EXAMPLE = path.join(UI, 'config.example.js');

if (!fs.existsSync(CONFIG)) {
  fs.copyFileSync(CONFIG_EXAMPLE, CONFIG);
  console.log('Created ui/config.js from ui/config.example.js.');
  console.log('Edit it with your Supabase project URL and publishable key.');
}

const ORT_FILES = [
  'ort.wasm.min.js',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm'
];
const ORT_SOURCE = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const ORT_TARGET = path.join(UI, 'stt');

if (!fs.existsSync(ORT_SOURCE)) {
  console.error('onnxruntime-web is not installed. Run "npm ci" first.');
  process.exit(1);
}

for (const name of ORT_FILES) {
  const source = path.join(ORT_SOURCE, name);
  const target = path.join(ORT_TARGET, name);
  if (!fs.existsSync(source)) {
    console.error(`Missing ${name} in onnxruntime-web/dist.`);
    process.exit(1);
  }
  const needsCopy =
    !fs.existsSync(target) || fs.statSync(target).size !== fs.statSync(source).size;
  if (needsCopy) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${name}`);
  }
}

console.log('Runtime assets are ready.');
