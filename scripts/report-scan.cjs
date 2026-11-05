// End-to-end handoff test with no real hardware: turns a screenshot of the
// phone's QR screen into a fake webcam feed (Y4M), then checks that
// /monitor/report decodes it offline, shows "Record received" and logs it.
// Usage: node scripts/report-scan.cjs <phoneHandoffScreenshot.png> [baseUrl] [shotsDir]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PNG } = require(path.join(__dirname, '../node_modules/pngjs'));

const [shotPath, base = 'http://localhost:4173', out = os.tmpdir()] = process.argv.slice(2);
const W = 1280, H = 720;

function makeY4m(pngPath, y4mPath) {
  const src = PNG.sync.read(fs.readFileSync(pngPath));
  // Phone screen centred in a grey room, scaled to ~85% of frame height.
  const scale = (H * 0.85) / src.height;
  const pw = Math.round(src.width * scale), ph = Math.round(src.height * scale);
  const ox = (W - pw) >> 1, oy = (H - ph) >> 1;
  const rgb = (x, y) => {
    const sx = Math.floor((x - ox) / scale), sy = Math.floor((y - oy) / scale);
    if (x < ox || y < oy || sx >= src.width || sy >= src.height) return [90, 90, 95];
    const i = (sy * src.width + sx) * 4;
    return [src.data[i], src.data[i + 1], src.data[i + 2]];
  };
  const Y = Buffer.alloc(W * H), U = Buffer.alloc((W * H) / 4), V = Buffer.alloc((W * H) / 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = rgb(x, y);
      Y[y * W + x] = Math.max(0, Math.min(255, Math.round(0.257 * r + 0.504 * g + 0.098 * b + 16)));
      if (!(x & 1) && !(y & 1)) {
        const j = (y >> 1) * (W >> 1) + (x >> 1);
        U[j] = Math.round(-0.148 * r - 0.291 * g + 0.439 * b + 128);
        V[j] = Math.round(0.439 * r - 0.368 * g - 0.071 * b + 128);
      }
    }
  const frame = Buffer.concat([Buffer.from('FRAME\n'), Y, U, V]);
  const parts = [Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`)];
  for (let i = 0; i < 10; i++) parts.push(frame);
  fs.writeFileSync(y4mPath, Buffer.concat(parts));
}

(async () => {
  const y4m = path.join(out, 'fake-cam.y4m');
  makeY4m(shotPath, y4m);
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`],
  });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ['camera'] });
  const page = await ctx.newPage();
  await page.goto(base + '/monitor/report');
  await page.evaluate(() => localStorage.removeItem('pinpoint.report.inbox'));
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 });
  await ctx.setOffline(true);
  const t = Date.now();
  await page.reload();
  await page.locator('.report-tag', { hasText: /^Received / }).waitFor({ timeout: 15000 }).catch(async (e) => {
    await page.screenshot({ path: path.join(out, 'report-fail.png') });
    throw e;
  });
  const ms = Date.now() - t;
  const sub = await page.locator('.received-sub').textContent().catch(() => '(intro already gone)');
  await page.screenshot({ path: path.join(out, 'report-received.png') });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(out, 'report-full.png') });
  const count = await page.locator('.stat-n').textContent();
  const missing = await page.locator('.rf.missing').count();
  console.log(`OK scanned offline in ${ms} ms from page load. ${sub}. Handoffs tonight: ${count}. Fields marked Not recorded: ${missing}.`);
  await browser.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
