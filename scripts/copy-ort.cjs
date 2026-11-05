// Copies the ONNX runtime wasm that transformers.js uses into public/ort/,
// so the speech engine never reaches out to a CDN.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../node_modules/@huggingface/transformers/dist');
const dst = path.join(__dirname, '../public/ort');
fs.mkdirSync(dst, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log('Copied ONNX runtime to public/ort/');
