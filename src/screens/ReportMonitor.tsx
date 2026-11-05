// /monitor/report: "Reporting". A phone shows its QR to the webcam, the
// record is decoded on this laptop (bundled jsQR, no network) and the report
// is rendered from it. After 60 s idle it replays a sample record.
// Keys: A = attract now, Shift+X = clear tonight's inbox.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decodeRecord, encodeRecord, QR_PREFIX } from '../core/handoff';
import { getLocation } from '../core/protocol';
import { buildRecord, type PinRecord } from '../core/record';
import { scriptEvents } from '../core/script';
import { DemoLabel } from '../components/DemoLabel';
import { ReportView, reportBlockCount } from '../components/ReportView';
import { Stage } from '../components/Stage';
import { sameEvening, useInbox, type InboxItem } from '../lib/inbox';
import { useQrScanner } from '../lib/qrScanner';
import { clock, useNow } from '../lib/time';

const IDLE_MS = 60_000;
const INTRO_MS = 2400;
const ATTRACT_CYCLE_MS = 32_000;

type Shown =
  | { kind: 'attract'; cycle: number; since: number }
  | { kind: 'real'; record: PinRecord; bytes: number; receivedAt: number; key: string; since: number };

function sampleRecord(): { record: PinRecord; bytes: number } {
  const d = new Date();
  d.setHours(18, 10, 0, 0); // a November evening on the trail
  const record = buildRecord(scriptEvents(d.getTime(), 'pp', 'sample'));
  return { record, bytes: encodeRecord(record).compressedBytes };
}

function recordKey(r: PinRecord) {
  return `${r.id}:${r.confirmedAt ?? r.endedAt ?? r.t0}`;
}

export function ReportMonitor() {
  const now = useNow(200);
  const inbox = useInbox();
  const sample = useMemo(sampleRecord, []);
  const [shown, setShown] = useState<Shown>(() => ({ kind: 'attract', cycle: 0, since: Date.now() }));
  const [notice, setNotice] = useState<{ text: string; until: number } | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // When each record was last seen by the camera. A code only triggers when it
  // newly appears, so a phone left in front of the camera can't loop the show.
  const lastSeen = useRef(new Map<string, number>());

  const showReal = useCallback((record: PinRecord, bytes: number, receivedAt: number) => {
    setShown({ kind: 'real', record, bytes, receivedAt, key: recordKey(record), since: Date.now() });
  }, []);

  const onCode = useCallback(
    (data: string) => {
      const t = Date.now();
      if (!data.startsWith(QR_PREFIX)) {
        setNotice({ text: 'That code is not a Pinpoint record', until: t + 2500 });
        return;
      }
      let decoded: ReturnType<typeof decodeRecord>;
      try {
        decoded = decodeRecord(data);
      } catch {
        setNotice({ text: 'Could not read that record. Hold steady and try again.', until: t + 2500 });
        return;
      }
      const key = recordKey(decoded.record);
      const cur = shownRef.current;
      const seenBefore = lastSeen.current.get(key);
      lastSeen.current.set(key, t);
      if (cur.kind === 'real' && cur.key === key) return;
      if (seenBefore !== undefined && t - seenBefore < 3000) return;
      const prev = inbox.items.find((i) => i.key === key);
      const receivedAt = prev?.receivedAt ?? t;
      if (!prev) inbox.add({ key, receivedAt: t, loc: decoded.record.loc, bytes: decoded.compressedBytes, payload: data });
      showReal(decoded.record, decoded.compressedBytes, receivedAt);
    },
    [inbox, showReal],
  );

  const { videoRef, cam } = useQrScanner(onCode);

  // Idle -> attract; attract cycles.
  useEffect(() => {
    if (shown.kind === 'real' && now - shown.since > IDLE_MS) setShown({ kind: 'attract', cycle: 0, since: now });
    if (shown.kind === 'attract' && now - shown.since > ATTRACT_CYCLE_MS) setShown({ kind: 'attract', cycle: shown.cycle + 1, since: now });
  }, [now, shown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') setShown({ kind: 'attract', cycle: 0, since: Date.now() });
      if (e.key === 'X' && e.shiftKey) inbox.clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inbox]);

  const record = shown.kind === 'real' ? shown.record : sample.record;
  const bytes = shown.kind === 'real' ? shown.bytes : sample.bytes;
  const age = now - shown.since;
  const intro = age < INTRO_MS;
  const stepMs = shown.kind === 'real' ? 140 : 650;
  const reveal = intro ? 0 : Math.min(reportBlockCount(record), Math.floor((age - INTRO_MS) / stepMs) + 1);
  const tonight = inbox.items.filter((i) => sameEvening(i.receivedAt, now));

  // Measured, never invented: last step -> report on screen, for a real handoff.
  const measuredS =
    shown.kind === 'real' && record.endedAt !== undefined ? Math.max(0, Math.round((shown.receivedAt - record.endedAt) / 1000)) : undefined;

  return (
    <Stage className="monitor reportmon">
      <header className="mon-head">
        <h1>The record that survives every handoff</h1>
        <div className="stat">
          <span className="stat-n">{tonight.length}</span>
          <span className="stat-l">{tonight.length === 1 ? 'handoff tonight' : 'handoffs tonight'}</span>
        </div>
      </header>

      <div className="report-grid">
        <aside className="handoff-col">
          <div className={`cam ${cam}`}>
            <video ref={videoRef} muted playsInline />
            <div className="cam-frame" />
            <div className="cam-prompt">Hold your phone here to hand off</div>
            {cam !== 'live' && (
              <div className="cam-msg">
                {cam === 'starting' && 'Starting camera…'}
                {cam === 'denied' && 'Camera blocked. Allow camera access for this page and reload.'}
                {cam === 'none' && 'No camera found. Plug in a webcam and reload.'}
              </div>
            )}
            {notice && notice.until > now && <div className="cam-notice">{notice.text}</div>}
          </div>
          <div className="inbox">
            <div className="meta-k">Tonight's handoffs · no patient names</div>
            {tonight.length ? (
              <ul>
                {tonight.slice(0, 5).map((it: InboxItem) => (
                  <li key={it.key}>
                    <button
                      className={shown.kind === 'real' && shown.key === it.key ? 'on' : ''}
                      onClick={() => {
                        try {
                          const d = decodeRecord(it.payload);
                          showReal(d.record, d.compressedBytes, it.receivedAt);
                        } catch {
                          /* ignore corrupt entry */
                        }
                      }}
                    >
                      <span className="ib-t">{clock(it.receivedAt).slice(0, 5)}</span>
                      <span className="ib-l">{getLocation(it.loc).label.split(',')[0]}</span>
                      <span className="ib-b">{it.bytes} bytes</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="inbox-empty">None yet. Be the first.</div>
            )}
          </div>
        </aside>

        <main className="report-col" key={shown.kind === 'real' ? shown.key + shown.since : `attract${shown.cycle}`}>
          <ReportView
            record={record}
            reveal={reveal}
            tag={shown.kind === 'real' ? `Received ${clock(shown.receivedAt)} · ${bytes} bytes` : 'Sample record · replay'}
          />
          {intro && (
            <div className="received">
              <div className="received-card">
                <div className="received-check">✓</div>
                <div className="received-title">Record received</div>
                <div className="received-sub">
                  {bytes} bytes · no signal used{shown.kind === 'attract' ? ' · sample' : ''}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="ba-strip">
        <div className="ba before">
          <div className="ba-k">Paper report</div>
          <div className="ba-v">Written after the call, from memory</div>
        </div>
        <div className="ba after">
          <div className="ba-k">Pinpoint</div>
          <div className="ba-v">Built during care, every line traced to what was said</div>
          {measuredS !== undefined && <div className="ba-m">Measured on this handoff: last step to finished report in {measuredS} s</div>}
        </div>
      </footer>
      <DemoLabel />
    </Stage>
  );
}
