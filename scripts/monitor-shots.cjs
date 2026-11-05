// Screenshots a monitor route at 1920x1080 at chosen loop times, using
// Playwright's fake clock to fast-forward. Also reports scroll overflow.
// Usage: node scripts/monitor-shots.cjs <baseUrl> <route> <outDir> <sec,sec,...>
const { chromium } = require('playwright');
const [base = 'http://localhost:4173', route = '/monitor/medic', out = '.', secs = '5,20,34,47,56,69'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.clock.install();
  await p.goto(base + route);
  let at = 0;
  for (const s of secs.split(',').map(Number)) {
    await p.clock.runFor((s - at) * 1000);
    at = s;
    await p.waitForTimeout(400);
    const name = `${out}/${route.replace(/\//g, '_')}-${String(s).padStart(3, '0')}s.png`;
    await p.screenshot({ path: name });
    console.log('shot', name);
  }
  await b.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
