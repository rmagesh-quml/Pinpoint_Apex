// End-to-end phone run at Galaxy S25 size (360x780 CSS px), fully offline
// after the first load. Checks no step screen scrolls, then decodes the QR
// straight off a screenshot of the handoff screen.
// Usage: npm run build && (npm run preview &) && node scripts/phone-run.cjs [baseUrl] [shotsDir]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PNG } = require(path.join(__dirname, '../node_modules/pngjs'));
const jsQR = require(path.join(__dirname, '../node_modules/jsqr'));

const base = process.argv[2] || 'http://localhost:4173';
const shots = process.argv[3];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/phone');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
  await ctx.setOffline(true);
  await page.reload();

  let n = 0;
  const shot = async (name) => shots && (await page.waitForTimeout(350), page.screenshot({ path: `${shots}/${String(++n).padStart(2, '0')}-${name}.png` }));
  const noScroll = async (label) => {
    const over = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (over > 0) throw new Error(`${label}: page scrolls by ${over}px`);
  };
  const tap = (name) => page.getByRole('button', { name, exact: true }).first().click();

  await shot('start');
  await noScroll('start');
  await tap('Start · Severe bleeding');

  // Talk: quick phrases -> chips -> confirm.
  await tap('Talk');
  await tap('Deep cut to the left thigh');
  await shot('talk-chips');
  while (await page.locator('.chip:not(.done):not(.miss)').count()) await page.locator('.chip:not(.done):not(.miss)').first().click();
  await tap('Heavy bleeding');
  await page.locator('.chip:not(.done)').first().click();
  await tap('Close');

  // Ask a vetted question.
  await tap('Ask');
  await tap('Can I loosen the tourniquet?');
  await page.getByText('No. Leave it on').waitFor();
  await shot('ask-answer');
  await tap('Close');

  const steps = [['Done', 'help'], ['Still bleeding', 'pressure'], ['Packed', 'pack'], ['Done', 'tq'], ['Done', 'tighten'], ['Done', 'time'], ['Done', 'leave']];
  for (const [btn, id] of steps) {
    await noScroll(`step ${id}`);
    await shot(`step-${id}`);
    await tap(btn);
  }

  await page.getByText('Vitals not recorded yet').first().waitFor();
  await shot('complete-reminder');
  await noScroll('complete');

  await tap('Review record');
  await shot('review');
  await page.locator('.field', { hasText: 'Pulse' }).getByRole('button', { name: 'Add' }).click();
  await tap('110 /min');
  await page.locator('.field', { hasText: 'Breathing' }).getByRole('button', { name: 'Add' }).click();
  await tap('Fast');
  await page.locator('.field', { hasText: 'Level of response' }).getByRole('button', { name: 'Add' }).click();
  await tap('Alert');
  await tap('Hand off');
  await tap('Confirm and show code');
  await page.locator('.qr svg').waitFor();
  const sizeText = await page.locator('.handoff-size').textContent();
  await noScroll('handoff');
  await shot('handoff');

  // Decode the QR from pixels, as the webcam will.
  const png = PNG.sync.read(await page.locator('.qr').screenshot());
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!code) throw new Error('QR did not decode from screenshot');
  if (shots) fs.writeFileSync(path.join(shots, 'last-payload.txt'), code.data);
  const net = await page.locator('.badge', { hasText: 'Network requests' }).first().textContent();
  console.log(`OK phone run offline. ${sizeText}. ${net}. QR decoded from pixels: ${code.data.length} chars.`);

  await tap('New demo');
  await page.getByRole('button', { name: 'Start · Severe bleeding' }).waitFor();
  console.log('OK New demo resets to the start screen.');
  await browser.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
