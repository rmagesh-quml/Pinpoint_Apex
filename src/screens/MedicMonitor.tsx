// /monitor/medic: "Offline Medic AI". Attract mode loops the scripted
// Pandapas Pond run through the same engine and extractor as the phone.
// Space pauses / resumes; R (or Shift+Space) restarts the loop.
import { useEffect, useMemo } from 'react';
import { FALLBACK_ANSWER, getAnswer } from '../core/answers';
import type { PinEvent } from '../core/events';
import { extract } from '../core/extract';
import { FIELD_KEYS, FIELD_LABELS } from '../core/fields';
import { encodeRecord } from '../core/handoff';
import { getLocation, getStep, PROTOCOL_LABEL, PROTOCOL_NAME, STEPS } from '../core/protocol';
import { buildRecord, currentStep, type PinRecord } from '../core/record';
import { DemoLabel } from '../components/DemoLabel';
import { ProofBadges } from '../components/ProofBadges';
import { QrCode } from '../components/QrCode';
import { Stage } from '../components/Stage';
import { useScriptReplay } from '../lib/replay';
import { clock, elapsed } from '../lib/time';

type Say = Extract<PinEvent, { k: 'say' }>;
type Ask = Extract<PinEvent, { k: 'ask' }>;

const CHIP_WINDOW_MS = 4000;
const ANSWER_WINDOW_MS = 6000;

export function MedicMonitor() {
  const rp = useScriptReplay();
  const { events, now } = rp;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.shiftKey) rp.restart();
      else if (e.code === 'Space') rp.toggle();
      else if (e.key === 'r' || e.key === 'R') rp.restart();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rp]);

  const record = useMemo(() => buildRecord(events), [events]);
  const step = currentStep(events);
  const says = events.filter((e): e is Say => e.k === 'say');
  const asks = events.filter((e): e is Ask => e.k === 'ask');
  const lastSay = says[says.length - 1];
  const lastAsk = asks[asks.length - 1];
  const ended = record.confirmedAt !== undefined;

  let phase: 'step' | 'talk' | 'ask' | 'handoff' = 'step';
  if (ended) phase = 'handoff';
  else if (lastAsk && now - lastAsk.t < ANSWER_WINDOW_MS && (!lastSay || lastAsk.t > lastSay.t)) phase = 'ask';
  else if (lastSay && now - lastSay.t < CHIP_WINDOW_MS) phase = 'talk';

  return (
    <Stage className="monitor medic">
      <header className="mon-head">
        <h1>
          Pinpoint <span className="dot">·</span> Offline Medic AI
        </h1>
        <ProofBadges split />
      </header>

      <div className="medic-grid">
        <section className="medic-left">
          <PhoneMock phase={phase} record={record} step={step} lastSay={lastSay} lastAsk={lastAsk} now={now} />
          <p className="caption">Talk while you treat. Pinpoint follows the protocol and writes as you go. No signal needed.</p>
          <div className="replay-tag">
            <span className="warn-text">{PROTOCOL_LABEL}</span> · {rp.paused ? 'Paused · press space to resume' : 'Scripted demo run · loops'}
          </div>
        </section>

        <section className="medic-right">
          <div className="medic-row">
            <StepCard step={step} ended={ended} />
            <TqClock record={record} now={now} />
          </div>
          <Transcript events={events} />
          <RecordGrid record={record} now={now} />
        </section>
      </div>
      <DemoLabel />
    </Stage>
  );
}

function PhoneMock({
  phase,
  record,
  step,
  lastSay,
  lastAsk,
  now,
}: {
  phase: 'step' | 'talk' | 'ask' | 'handoff';
  record: PinRecord;
  step: string;
  lastSay?: Say;
  lastAsk?: Ask;
  now: number;
}) {
  const enc = useMemo(() => (phase === 'handoff' ? encodeRecord(record) : null), [phase, record]);
  const st = step !== 'end' ? getStep(step) : undefined;
  return (
    <div className="mock">
      <div className="mock-screen">
        <div className="mock-head">
          <div>
            <div className="mock-title">{PROTOCOL_NAME}</div>
            <div className="mock-sub">
              {getLocation(record.loc).label.split(',')[0]} · {elapsed(now - record.t0)}
            </div>
          </div>
        </div>
        {record.tqAt !== undefined && (
          <div className="mock-tq">
            <span>Tourniquet</span>
            <strong>{elapsed(now - record.tqAt)}</strong>
          </div>
        )}
        <div className="mock-body" key={phase + step + (lastSay?.t ?? '') + (lastAsk?.t ?? '')}>
          {phase === 'handoff' && enc && (
            <div className="mock-qr">
              <QrCode payload={enc.payload} className="qr" />
              <div className="mock-size">Whole record: {enc.compressedBytes} bytes</div>
            </div>
          )}
          {phase === 'talk' && lastSay && (
            <div className="mock-talk">
              <q>{lastSay.text}</q>
              {extract(lastSay.text).map((s) => {
                const done = record.fields[s.key]?.said === lastSay.text;
                return (
                  <div key={s.key} className={`mock-chip ${done ? 'done' : ''}`}>
                    <span>{FIELD_LABELS[s.key]}</span>
                    <b>{s.value}</b>
                    <i>{done ? 'Recorded' : 'Tap to record'}</i>
                  </div>
                );
              })}
            </div>
          )}
          {phase === 'ask' && lastAsk && (
            <div className="mock-answer">
              <div className="mock-q">{lastAsk.text}</div>
              <div className="mock-a">{(lastAsk.q && getAnswer(lastAsk.q)?.answer) || FALLBACK_ANSWER}</div>
            </div>
          )}
          {phase === 'step' && st && (
            <div className="mock-step">
              <div className="mock-meta">Step {STEPS.indexOf(st) + 1}</div>
              <div className="mock-step-title">{st.title}</div>
              <div className="mock-step-body">{st.id === 'time' && record.tqAt ? `Tourniquet went on at ${clock(record.tqAt)}.` : st.body}</div>
              <div className="mock-btns">
                {(st.options ?? [{ id: 'done', label: 'Done' }]).map((o) => (
                  <div key={o.id} className="mock-btn">
                    {o.label}
                  </div>
                ))}
                <div className="mock-btn sec">Not sure</div>
              </div>
            </div>
          )}
          {phase === 'step' && !st && <div className="mock-step-title">Ready to hand off</div>}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, ended }: { step: string; ended: boolean }) {
  const st = step !== 'end' ? getStep(step) : undefined;
  return (
    <div className="card step-card" key={step}>
      <div className="card-k">{st ? `Step ${STEPS.indexOf(st) + 1} of the protocol` : 'Protocol complete'}</div>
      <div className="card-title">{st ? st.title : ended ? 'Handed off by QR code' : 'Ready to hand off'}</div>
    </div>
  );
}

function TqClock({ record, now }: { record: PinRecord; now: number }) {
  return (
    <div className={`card tq-card ${record.tqAt ? 'on' : ''}`}>
      <div className="card-k">Tourniquet clock</div>
      {record.tqAt ? (
        <>
          <div className="tq-big">{elapsed(now - record.tqAt)}</div>
          <div className="card-body">on at {clock(record.tqAt)}</div>
        </>
      ) : (
        <div className="tq-off">Not started</div>
      )}
    </div>
  );
}

function Transcript({ events }: { events: PinEvent[] }) {
  const bubbles: { key: string; who: 'me' | 'pp'; text: string; meta: string }[] = [];
  for (const e of events) {
    if (e.k === 'say') bubbles.push({ key: `s${e.t}`, who: 'me', text: e.text, meta: `Responder · ${clock(e.t)}` });
    if (e.k === 'ask') {
      const vetted = e.q && getAnswer(e.q);
      bubbles.push({
        key: `a${e.t}`,
        who: 'pp',
        text: vetted ? vetted.answer : FALLBACK_ANSWER,
        meta: `Asked “${e.text ?? ''}” at ${clock(e.t)} · ${vetted ? 'vetted answer' : 'no vetted answer'}`,
      });
    }
  }
  const shown = bubbles.slice(-2);
  return (
    <div className="card transcript-card">
      <div className="card-k">Voice transcript</div>
      <div className="bubbles">
      {shown.length ? (
        shown.map((b) => (
          <div key={b.key} className={`bubble ${b.who}`}>
            <div className="bubble-text">{b.text}</div>
            <div className="bubble-meta">{b.meta}</div>
          </div>
        ))
      ) : (
        <div className="card-body muted">Listening on this device…</div>
      )}
      </div>
    </div>
  );
}

function RecordGrid({ record, now }: { record: PinRecord; now: number }) {
  return (
    <div className="card record-card">
      <div className="card-k">Patient record · built from what was said</div>
      <div className="rec-grid">
        {FIELD_KEYS.map((k) => {
          const f = record.fields[k];
          const fresh = f && now - f.t < 1500;
          return (
            <div key={k + (f ? 'y' : 'n')} className={`rec ${f ? 'have' : ''} ${fresh ? 'fresh' : ''}`}>
              <div className="rec-k">
                {FIELD_LABELS[k]}
                {f && <span className="rec-src"> · {f.via === 'voice' && f.saidT ? `said at ${clock(f.saidT)}` : `tapped at ${clock(f.t)}`}</span>}
              </div>
              <div className="rec-v">{f ? f.value : 'Not recorded yet'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
