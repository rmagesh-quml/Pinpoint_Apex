# Build prompt: Pinpoint showcase demo (Apex Incubator Showcase, Blacksburg, Mon Nov 9, 2026)

Paste everything below the line into a NEW Claude Code session, in a NEW folder called `pinpoint-showcase`. Keep it separate from the Core v1 repo: this is a demo, not the product.

---

You are building a demo for Pinpoint's table at the Apex Incubator Showcase in Blacksburg, VA on Monday, November 9, 2026 (doors 6:00 PM, setup 5:15 PM). The deadline is Sunday night, Nov 8, so the build must be finished and rehearsed by then. Keep the scope tight. A demo that works every single time beats a feature-rich one.

## What Pinpoint is

Pinpoint is an offline, on-device tool for rescuers. The responder talks while treating a patient, the phone follows an approved protocol step by step and builds the patient record from what was said, and the record is handed off to the next crew, all with no signal. Tagline: "The record that survives every handoff."

## What to build

One web app (Vite + React + TypeScript, installable PWA) with three screens:

1. **`/phone`: the field app.** Our cofounder carries it on a Samsung Galaxy S25 (Chrome) all evening and demos it to visitors.
2. **`/monitor/medic`: the "Offline Medic AI" monitor.** A big-screen view (1920x1080) of the medic side.
3. **`/monitor/report`: the "Reporting" monitor.** A big-screen view (1920x1080) of the record and report side, where the handoff lands.

The two monitor screens run on one laptop driving two displays (or two laptops), each browser full-screen.

## Non-negotiable rules

1. **It must really work offline.** After one online load, the phone app works in airplane mode and the monitors work with the laptop's Wi-Fi off. A service worker caches every asset, including any speech model. Test this for real. Never fake offline behavior or show a claim the demo can't back up.
2. **Visible proof.** Both the phone and the medic monitor show an "Airplane mode · Running on this device" badge and a live **network requests counter** since the incident started. Measure it for real, using `PerformanceObserver` on resource entries plus a wrapped `fetch`. It should read 0.
3. **The phone never talks to the monitors over a network.** The handoff is a QR code (see Handoff), which is the whole point: the record moves with no signal.
4. **Demo medical content only.** Use one protocol: severe bleeding, adapted from public bystander bleeding-control education (call for help, apply firm direct pressure, pack the wound if trained, apply a tourniquet 2 to 3 inches above the wound and not on a joint, tighten until the bleeding stops, note the time, never loosen or remove it). Mark it on screen as "Demo protocol · pending medical review". Do not invent any other clinical advice.
5. **Follow-up questions use a fixed answer bank.** About 6 vetted question-and-answer pairs (for example "Can I loosen the tourniquet?" → "No. Leave it on and tighten it if bleeding returns. EMS will manage it."). Anything else gets: "I don't have guidance on that. Follow your training and wait for EMS." Never generate an answer.
6. **Nothing is recorded without a tap.** Voice suggestions appear as chips the responder confirms. Every field in the record keeps the exact words it came from and a timestamp.
7. **A small "Showcase demo, not for patient care" label** on every screen.
8. **No real agency names or logos.** Real Blacksburg place names are fine. For the receiving crew, use generic labels like "Receiving crew: Blacksburg-area rescue squad (demo)". Do not show any real squad, hospital or department name or logo as if it uses Pinpoint.

## Blacksburg framing

- **Scenario:** "Mountain biker crash on the Brush Mountain trails near Pandapas Pond, Jefferson National Forest, about 15 minutes from campus. No cell signal on the trail. Deep cut to the left thigh with heavy bleeding." Also include a selectable second location for variety: "Hiker fall on the Cascades trail, Giles County."
- **Time and weather:** a November evening, cold, getting dark.
- **Handoff:** from the "Trail rescue team" to the "Receiving crew: Blacksburg-area rescue squad (demo)" at the trailhead.
- Use the Virginia Tech maroon and orange as accents on the monitors only, alongside the Pinpoint look. Don't use any VT logo.

## `/phone`: the field app

- **Start:** one tap, no sign-in. Pick the location (the two options above, defaulting to Pandapas Pond).
- **Step screens:** one step per screen in large type, with **Done**, **Not sure** and answer buttons. A running **tourniquet clock** starts when the tourniquet step is marked done. No scrolling or pinching.
- **Voice:**
  - Push-to-talk button. The transcript shows on screen.
  - A phrase-rule extractor maps the words to record fields (injury, location on the body, bleeding type, tourniquet applied and time, vitals like pulse and breathing, level of response) and offers them as chips to confirm.
  - Unrecognized phrases show "Didn't catch that. Tap instead?" Never guess.
- **Ask button:** plays a vetted answer from the answer bank, or the fallback line.
- **Reminders:** if a required field such as vitals hasn't been recorded by the end of the protocol, show "Vitals not recorded yet" before the handoff.
- **Record review:** everything recorded, with times and the source words, editable.
- **Handoff:**
  - A "Hand off" button compresses the record (JSON → `fflate` deflate → base64url) into a QR code shown full-screen.
  - Keep the record compact so it fits comfortably in one QR code (target under 1,500 bytes compressed).
  - Show the compressed size on screen ("Whole record: 812 bytes").
- **Reset:** a "New demo" button wipes everything for the next visitor in one tap.
- **Speech engine (spike this FIRST, day 1):**
  - Try `whisper-tiny.en` in the browser via transformers.js, cached for offline. Measure on the S25 in airplane mode: model load time, and seconds from end of speech to transcript.
  - If it works offline in under about 4 seconds, use it.
  - If it doesn't, ship **tap plus quick-phrase buttons** ("Heavy bleeding", "Tourniquet on", "Pulse 110"...) and drop live voice for the showcase.
  - Do NOT use the browser's built-in speech recognition unless you've proven it works in airplane mode on the S25, because it usually sends audio to a server.
  - Report what you measured.

## `/monitor/medic`: "Offline Medic AI"

The headline is "Pinpoint · Offline Medic AI". The screen shows the medic side in big type, readable from 8 feet.

- **Left half:** a large phone mockup playing the scenario.
- **Right half:**
  - The voice transcript as chat bubbles.
  - The current protocol step card.
  - The record fields filling in as each one is confirmed.
  - The tourniquet clock.
  - Badges: "Airplane mode", "Runs on this device", "Network requests: 0".
- **Attract mode, the default:**
  - Loops a scripted run of the Pandapas Pond scenario, about 75 seconds, with realistic pacing.
  - It is driven by the same protocol engine and extractor as the phone, fed scripted transcript lines, not a video.
  - A short caption under the loop reads: "Talk while you treat. Pinpoint follows the protocol and writes as you go. No signal needed."
- A keyboard shortcut (space) pauses or restarts the loop.

## `/monitor/report`: "Reporting"

The headline is "The record that survives every handoff".

- **Handoff zone:**
  - A webcam view (laptop camera or USB webcam) with a big "Hold your phone here to hand off" prompt.
  - It uses a bundled QR decoder (`jsQR` or `@zxing/browser`), so no network is needed.
  - When a code is scanned: show a satisfying "Record received · 812 bytes · no signal used" animation, then render the report.
- **The report:**
  - A clean patient care report layout: incident, location, times, patient, injury, interventions with times (tourniquet at 18:12:04), vitals, and the responder's confirmation.
  - Each field shows a small tag with the exact words it came from ("said at 18:12:04").
  - Missing items are clearly marked "Not recorded".
  - "Download PDF" is optional, only if there's time.
- **Before and after strip:**
  - "Paper report: written after the call, from memory" vs. "Pinpoint: built during care, every line traced to what was said."
  - Use no invented statistics. Only show numbers you actually measured in rehearsal, like time from the last step to a finished report.
- **Attract mode, the default when idle for 60 seconds:** replays a sample record arriving and the report assembling field by field.
- **Inbox:** a list of the handoffs received tonight, showing time, location and size, with no patient names. The count is a nice live stat for visitors ("14 handoffs tonight").

## Shared core

Put the protocol, answer bank, extractor rules, record builder and QR encode/decode in `src/core/`, used by all three screens. The record is always built from an append-only event log, and the report is always rendered from the record, with no free-typed or generated text. Add a handful of unit tests for the extractor and the encode/decode round trip.

## Design

- Dark, high-contrast theme. Very large type on the monitors (minimum 32px body, 72px+ headlines).
- Calm and confident, like real emergency equipment, not a flashy startup site.
- Phone: buttons at least 64px tall, usable with one hand and gloves.
- Animations are short and purposeful: fields sliding into the record, the QR "received" moment.

## Hosting and setup

- Deploy as a static site on a free host (Vercel, Netlify or GitHub Pages) for the first online load.
- After that, everything must work offline. Also support running the monitors from the laptop with `npm run build && npm run preview`, with Wi-Fi off.
- Write `SHOWCASE_SETUP.md` with:
  - how to install the PWA on the S25 and pre-cache the model
  - how to put both monitors full-screen
  - a 5:15 PM setup checklist
  - what to do if something breaks (restart the loop, reset the phone, the fallback to taps)

## Schedule

- **Thu Nov 5:** project skeleton, PWA plus offline caching, the speech spike on the S25 with measured results.
- **Fri Nov 6:** phone flow end to end, record review, QR handoff.
- **Sat Nov 7:** both monitors, attract loops, webcam QR scan.
- **Sun Nov 8:**
  - Full rehearsal: 10 complete runs with the phone in airplane mode and the laptop Wi-Fi off. Fix anything that fails even once.
  - Record a 60-second backup screen video of the whole flow.

## How to work

- Ask me before adding anything not listed here. When in doubt, cut scope.
- At the end of each session, finish with a block titled **Report for planning chat** (under 12 lines): what works, what you measured (speech latency, QR size, offline test results), what's next, and any risk to Monday.
