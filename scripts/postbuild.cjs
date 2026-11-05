// Vite also emits a copy of the ONNX runtime wasm into dist/assets because
// transformers.js references it by URL. The app loads it from /ort/ instead
// (wasmPaths), so the duplicate is dead weight (~21 MB) on the host.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../dist/assets');
for (const f of fs.readdirSync(dir)) {
  if (/^ort-wasm.*\.wasm$/.test(f)) {
    fs.unlinkSync(path.join(dir, f));
    console.log('Removed unused', f);
  }
}
