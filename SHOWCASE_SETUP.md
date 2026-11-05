# Showcase setup: Pinpoint at the Apex Incubator Showcase

Blacksburg, Monday Nov 9, 2026. Setup 5:15 PM, doors 6:00 PM.

Three screens, one web app:

| Screen | URL | Runs on |
|---|---|---|
| Field app | `/phone` | Galaxy S25, Chrome, installed as an app |
| Offline Medic AI | `/monitor/medic` | Laptop display 1, full screen |
| Reporting | `/monitor/report` | Laptop display 2, full screen, with the webcam |
| Speech test | `/spike` | S25 only, setup and diagnosis |

Everything works offline after **one online load per device**. The phone never talks to the laptop: the record moves by QR code.

---

## 0. Deploy (once, before Sunday's rehearsal)

Netlify is set up (`netlify.toml`, `public/_redirects`). Vercel also works (`vercel.json`). GitHub Pages is not set up: it needs extra routing work, so skip it.

**Netlify:** New site → Import from Git → pick this repo and branch. Build command `npm run build`, publish directory `dist` (both already in `netlify.toml`). Deploy. Note the HTTPS URL; below it is `https://YOUR-SITE`.

HTTPS matters. Chrome only allows the microphone and the camera on HTTPS or `localhost`.

To build locally instead (Node 18 or newer):

```bash
npm install
```

```bash
npm run build
```

---

## 1. Galaxy S25: install the app and cache everything

Do this on good Wi-Fi, not venue Wi-Fi. Do it Saturday or Sunday, then again only if the site is redeployed.

1. In Chrome on the S25, open `https://YOUR-SITE/phone`.
2. Chrome menu (⋮) → **Add to home screen** → **Install**. A "Pinpoint" icon appears.
3. Open the app from the icon once while online. Wait about 5 seconds: the service worker caches all app files.
4. **Pre-cache the speech model** (only if you want live voice):
   1. In Chrome, open `https://YOUR-SITE/spike`.
   2. Tap **1. Load model (online)**. It downloads whisper-tiny.en from huggingface.co (tens of MB) and the speech runtime from the site (about 22 MB). Allow time.
5. **Measure in airplane mode** (the Thursday spike):
   1. Turn on airplane mode. Wi-Fi off too.
   2. Reload `/spike`. Tap **Load model (offline)**. That load time is the offline model load.
   3. Hold **2. Hold to talk** and say each of the four sample lines. Do 5 or more runs. Allow the microphone the first time Chrome asks.
   4. Tap **Copy results** and paste them into the planning chat.
6. **Go / no-go on voice.** If release-to-transcript stays under about 4 s and the fields come out right, tap **Use voice on /phone**. Otherwise leave it off. The phone then uses quick-phrase buttons and taps, which always work.
7. Still in airplane mode, open the **Pinpoint app from the home-screen icon**:
   - The badge must read **Airplane mode · Running on this device**.
   - The start screen shows the voice status ("Voice: on this device", or "Voice: tap and quick phrases").
   - Run one full demo and check **Network requests: 0**.

Phone settings for the evening:
- Display → Screen timeout → **10 minutes**.
- Brightness to **max**. A bright screen scans much better.
- Auto-rotate off.
- Do Not Disturb on.
- Charge it to 100%.
- Bring a power bank and cable.

Note: if voice is on, the speech model loads when the app opens, before you tap Start. Opening the app fresh takes a few seconds while "Voice: loading on-device model…" shows. Wait for "Voice: on this device" before tapping Start.

---

## 2. Laptop: the two monitors

Pick **one** way to serve the monitors and stick with it. The inbox and camera permission are stored per address, so changing addresses starts fresh.

**Option A, deployed site (simplest).** While online, open `https://YOUR-SITE/monitor/medic` and `https://YOUR-SITE/monitor/report` once each. Allow the camera on the report page. Wi-Fi can then go off; the service worker serves both.

**Option B, local server (no internet needed at all).**

```bash
npm run build && npm run preview
```

Then open `http://localhost:4173/monitor/medic` and `http://localhost:4173/monitor/report`. Keep that terminal open all evening. `localhost` counts as secure, so the camera works.

### Full screen on two displays

1. Plug in the second display. Set it to **extend**, not mirror, and to **1920×1080** if offered. The monitors scale to any size, but 1080p is the design size.
2. Open the medic URL in one Chrome window and the report URL in a **separate window** (not a tab).
3. Drag each window to its display.
4. Click inside each window and go full screen:
   - Windows / Linux: **F11**
   - Mac: **Ctrl+Cmd+F**
5. Put the **report** monitor on the side with the webcam. Its prompt says "Hold your phone here to hand off".

Kiosk alternative (Windows example; repeat with the report URL for the second display):

```bash
chrome --new-window --kiosk --app=https://YOUR-SITE/monitor/medic
```

### Webcam

- Laptop camera or USB webcam. With both available, Chrome uses its default camera. Set it under chrome://settings/content/camera.
- Allow the camera the first time the report page asks. If it was blocked: click the camera icon in the address bar → Allow → reload.
- The scanner reads at full camera resolution. In rehearsal, find the distance that works (usually 20 to 35 cm, QR filling the dashed box). Put a strip of tape on the table there.

### Keys

| Screen | Key | Does |
|---|---|---|
| Medic | Space | Pause / resume the loop |
| Medic | R or Shift+Space | Restart the loop |
| Report | A | Go back to the attract replay now |
| Report | Shift+X | Clear tonight's handoff inbox (do this after rehearsal) |

---

## 3. 5:15 PM setup checklist

- [ ] Laptop on power. Second display connected, extended, 1080p.
- [ ] **Laptop Wi-Fi off.** (Option B: start `npm run preview` first.)
- [ ] Medic monitor full screen. Badges read **Airplane mode** · **Runs on this device** · **Network requests: 0**, and the loop is running.
- [ ] Report monitor full screen. Camera view is live, and the attract replay is cycling.
- [ ] Report monitor: press **Shift+X** so the count starts at **0 handoffs tonight**.
- [ ] Webcam aimed at the hand-off spot. Tape mark on the table at the scan distance.
- [ ] S25: 100% charge, brightness max, timeout 10 min, Do Not Disturb, **airplane mode on**.
- [ ] Open Pinpoint from the home-screen icon. Badge reads **Airplane mode · Running on this device**.
- [ ] Voice status on the start screen is what you decided (on-device voice, or taps and quick phrases).
- [ ] One full test run:
  - Start → Talk → quick phrases or voice → confirm chips.
  - Steps through to the tourniquet clock. Ask one question.
  - Add vitals in review → Hand off → Confirm → scan at the report monitor.
- [ ] The report monitor shows **Record received**, then the report. Then press **Shift+X** again to clear the test.
- [ ] Phone: tap **New demo**. Ready for the first visitor.
- [ ] Backup video (60 s screen recording from Sunday) on the laptop desktop, ready to play.
- [ ] "Showcase demo, not for patient care" is visible on all three screens.

---

## 4. If something breaks

Fix it in the order below and keep talking. The story still works with the monitors alone.

**Phone stuck or in a weird state.** Tap **New demo** (top right, or on the QR screen). It wipes everything in one tap.

**Phone app frozen or blank.** Close it from recent apps, then reopen it from the home-screen icon. The in-progress demo survives a reload. Tap New demo if you want a clean start.

**Network requests is above 0 on the phone.**
- Tap New demo, then Start again: the counter resets at Start.
- If it rises again, airplane mode may be off and the app may have fetched an update. Turn airplane mode on, close and reopen the app, run New demo.
- Never explain away a non-zero count. Reset it.

**Voice is slow, wrong, or not loading.** In the Talk sheet, use the quick-phrase buttons (always there, under the voice button), or "Didn't catch that. Tap instead?". To turn voice off for the night: open `/spike` in Chrome and tap **Voice on for /phone** so it reads "Use voice on /phone". Then reopen the app.

**The QR won't scan.**
- Brightness to max.
- Hold the phone flat-on to the camera inside the dashed box, about 25 cm away.
- Tilt slightly to kill glare from overhead lights.
- Hold still for 1 second.
- If it still fails, reload the report monitor (F5) and allow the camera if asked.

**Report monitor says "Camera blocked" or "No camera found".** Address bar camera icon → Allow → F5. For a USB webcam: replug it, pick it in chrome://settings/content/camera, F5.

**Report monitor stuck on one report.** Press **A** for the attract replay. It also returns by itself after 60 s idle.

**Medic loop frozen or out of sync.** Press **R** to restart. Pressing Space twice also resumes a pause.

**A monitor shows a blank page with Wi-Fi off.**
- Option A: the site was never loaded on this laptop. Turn Wi-Fi on briefly, load it, turn Wi-Fi off.
- Option B: the `npm run preview` terminal was closed. Restart it.

**Everything fails.** Play the 60-second backup video full screen and demo the phone flow by hand.

---

## 5. Rehearsal (Sunday)

Ten complete runs, phone in airplane mode, laptop Wi-Fi off. Fix anything that fails even once. For each run, write down:
- the time from the last step to the finished report (the report monitor shows it as "Measured on this handoff"),
- the record size,
- whether the first scan attempt worked.

Only numbers measured here may be quoted to visitors.

Before handing over to real devices, the automated checks below exercise the same build in headless Chromium (no real phone or camera). They need Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).

```bash
npm run rehearse
```

It runs, in order:
- the unit tests,
- an offline reload of every route,
- a full offline phone run at S25 size, which checks for no scrolling, a 0 network count, and a QR that decodes from pixels,
- an offline webcam scan of that QR on the report monitor, using a fake camera feed.

After rehearsal: report monitor **Shift+X**, phone **New demo**.
