// Real offline test. Loads the built site once online, waits for the service
// worker to take control, then cuts the network and reloads every route.
// Usage: npm run build && (npm run preview &) && node scripts/offline-check.cjs [baseUrl]
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://localhost:4173';
const routes = ['/phone', '/monitor/medic', '/monitor/report', '/'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + '/phone');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 });
  // Let precache finish.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1500);

  await ctx.setOffline(true);
  let failed = 0;
  for (const r of routes) {
    const t = Date.now();
    try {
      await page.goto(base + r, { waitUntil: 'load', timeout: 10000 });
      await page.waitForSelector('.demo-label', { timeout: 5000 });
      const ms = Date.now() - t;
      const badge = page.locator('.badge', { hasText: 'Network requests' });
      const net = (await badge.count()) ? await badge.first().textContent() : '(no counter on this screen)';
      console.log(`OK   ${r}  offline load ${ms} ms  ${net}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${r}  ${e.message.split('\n')[0]}`);
    }
  }
  await browser.close();
  console.log(failed ? `${failed} route(s) failed offline` : 'All routes load offline.');
  process.exit(failed ? 1 : 0);
})();
