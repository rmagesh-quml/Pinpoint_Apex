import { useMemo, useState, useSyncExternalStore } from 'react';
import { ANSWERS, FALLBACK_ANSWER, answerFor, type Answer } from '../core/answers';
import { confirmSuggestion, startEvents, stepEvents } from '../core/engine';
import type { PinEvent } from '../core/events';
import { extract, type Suggestion } from '../core/extract';
import { FIELD_KEYS, FIELD_LABELS, TAP_CHOICES, type FieldKey } from '../core/fields';
import { encodeRecord } from '../core/handoff';
import { HANDOFF_FROM, HANDOFF_TO, LOCATIONS, PROTOCOL_LABEL, PROTOCOL_NAME, STEPS, getLocation, getStep } from '../core/protocol';
import { buildRecord, currentStep, missingReminders, type PinRecord } from '../core/record';
import { DemoLabel } from '../components/DemoLabel';
import { ProofBadges } from '../components/ProofBadges';
import { QrCode } from '../components/QrCode';
import { SourceTag } from '../components/SourceTag';
import { useIncident } from '../lib/incidentStore';
import { resetNetworkCounter } from '../lib/netcount';
import { speakLocal, stopSpeaking } from '../lib/speak';
import { getSpeechEngine, subscribeSpeechEngine } from '../lib/speech';
import { clock, elapsed, useNow } from '../lib/time';

/** Quick phrases: tapped stand-ins for speech, run through the same extractor. */
const QUICK_PHRASES = [
  'Male, about 20 years old',
  'Deep cut to the left thigh',
  'Heavy bleeding',
  'Tourniquet on',
  'Pulse 110',
  'Breathing fast',
  'Alert and talking',
  'Bleeding controlled',
];

type View = 'steps' | 'review' | 'handoff';
type Sheet = null | 'say' | 'ask' | { pick: FieldKey | null; edit?: boolean };

export function Phone() {
  const { events, append, reset } = useIncident();
  const [view, setView] = useState<View>('steps');
  const [sheet, setSheet] = useState<Sheet>(null);
  const record = useMemo(() => buildRecord(events), [events]);
  const step = currentStep(events);
  const started = events.some((e) => e.k === 'start');

  const newDemo = () => {
    stopSpeaking();
    reset();
    setView('steps');
    setSheet(null);
  };

  if (!started) {
    return (
      <StartScreen
        onStart={(loc) => {
          resetNetworkCounter();
          append(startEvents(loc));
        }}
      />
    );
  }

  return (
    <div className="phone">
      <PhoneHeader record={record} onNewDemo={newDemo} />
      <div className="phone-body">
        {view === 'steps' &&
          (step === 'end' ? (
            <CompleteScreen record={record} onReview={() => setView('review')} onHandoff={() => setView('handoff')} onAdd={(k) => setSheet({ pick: k })} />
          ) : (
            <StepScreen events={events} stepId={step} record={record} onAnswer={(out) => append(stepEvents(events, step, out))} />
          ))}
        {view === 'review' && (
          <ReviewScreen
            record={record}
            ended={step === 'end'}
            onEdit={(k) => setSheet({ pick: k, edit: !!record.fields[k] })}
            onBack={() => setView('steps')}
            onHandoff={() => setView('handoff')}
          />
        )}
        {view === 'handoff' && (
          <HandoffScreen
            events={events}
            record={record}
            onConfirm={() => append([{ k: 'confirm', t: Date.now() }])}
            onAdd={(k) => setSheet({ pick: k })}
            onBack={() => setView('review')}
            onNewDemo={newDemo}
          />
        )}
      </div>
      {view === 'steps' && (
        <nav className="phone-bar">
          <button className="bar-btn" onClick={() => setSheet('say')}>
            Talk
          </button>
          <button className="bar-btn" onClick={() => setSheet('ask')}>
            Ask
          </button>
          <button className="bar-btn" onClick={() => setView('review')}>
            Record <span className="count">{Object.keys(record.fields).length}</span>
          </button>
        </nav>
      )}
      {sheet === 'say' && <SaySheet record={record} append={append} onClose={() => setSheet(null)} onTap={(k) => setSheet({ pick: k })} />}
      {sheet === 'ask' && <AskSheet append={append} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && (
        <TapPicker
          initial={sheet.pick}
          record={record}
          onPick={(key, value) => {
            const exists = !!record.fields[key];
            append([{ k: 'field', t: Date.now(), key, value, via: exists ? 'edit' : 'tap' }]);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      <DemoLabel inline />
    </div>
  );
}

function StartScreen({ onStart }: { onStart: (loc: string) => void }) {
  const [loc, setLoc] = useState(LOCATIONS[0].id);
  return (
    <div className="phone start">
      <div className="start-top">
        <ProofBadges />
        <h1 className="brand">Pinpoint</h1>
        <p className="tagline">The record that survives every handoff.</p>
      </div>
      <div className="start-locs" role="radiogroup" aria-label="Location">
        {LOCATIONS.map((l) => (
          <button key={l.id} role="radio" aria-checked={loc === l.id} className={`loc ${loc === l.id ? 'on' : ''}`} onClick={() => setLoc(l.id)}>
            <span className="loc-label">{l.label}</span>
            <span className="loc-scn">{l.scenario}</span>
          </button>
        ))}
      </div>
      <button className="btn primary huge" onClick={() => onStart(loc)}>
        Start · {PROTOCOL_NAME}
      </button>
      <p className="protocol-label">{PROTOCOL_LABEL}</p>
      <DemoLabel inline />
    </div>
  );
}

function PhoneHeader({ record, onNewDemo }: { record: PinRecord; onNewDemo: () => void }) {
  const now = useNow(1000);
  return (
    <header className="phone-head">
      <div className="head-row">
        <div>
          <div className="head-title">{PROTOCOL_NAME}</div>
          <div className="head-sub">
            {getLocation(record.loc).label} · {elapsed(now - record.t0)}
          </div>
        </div>
        <button className="btn ghost small" onClick={onNewDemo}>
          New demo
        </button>
      </div>
      {record.tqAt !== undefined && (
        <div className="tq-clock" aria-live="off">
          <span>Tourniquet on {clock(record.tqAt)}</span>
          <strong>{elapsed(now - record.tqAt)}</strong>
        </div>
      )}
      <ProofBadges />
    </header>
  );
}

function StepScreen({ stepId, record, onAnswer }: { events: PinEvent[]; stepId: string; record: PinRecord; onAnswer: (out: string) => void }) {
  const step = getStep(stepId)!;
  const n = STEPS.findIndex((s) => s.id === stepId) + 1;
  return (
    <section className="step" key={stepId}>
      <div className="step-meta">
        Step {n} · <span className="protocol-label inline">{PROTOCOL_LABEL}</span>
      </div>
      <h2 className="step-title">{step.title}</h2>
      <p className="step-body">
        {step.id === 'time' && record.tqAt !== undefined ? `Tourniquet went on at ${clock(record.tqAt)}. Pinpoint recorded it.` : step.body}
      </p>
      <div className="step-actions">
        {(step.options ?? [{ id: 'done', label: 'Done' }]).map((o) => (
          <button key={o.id} className="btn primary" onClick={() => onAnswer(o.id)}>
            {o.label}
          </button>
        ))}
        <button className="btn secondary" onClick={() => onAnswer('unsure')}>
          Not sure
        </button>
      </div>
    </section>
  );
}

function Reminders({ record, onAdd }: { record: PinRecord; onAdd: (k: FieldKey) => void }) {
  const missing = missingReminders(record);
  if (!missing.length) return null;
  const firstMissing = FIELD_KEYS.find((k) => ['pulse', 'breathing', 'response'].includes(k) && !record.fields[k]);
  return (
    <div className="reminders">
      {missing.map((m) => (
        <div key={m} className="reminder">
          {m}
        </div>
      ))}
      {firstMissing && (
        <button className="btn secondary" onClick={() => onAdd(firstMissing)}>
          Add {FIELD_LABELS[firstMissing].toLowerCase()} now
        </button>
      )}
    </div>
  );
}

function CompleteScreen({ record, onReview, onHandoff, onAdd }: { record: PinRecord; onReview: () => void; onHandoff: () => void; onAdd: (k: FieldKey) => void }) {
  return (
    <section className="step">
      <div className="step-meta">Protocol complete</div>
      <h2 className="step-title">Ready to hand off</h2>
      <Reminders record={record} onAdd={onAdd} />
      <div className="step-actions">
        <button className="btn secondary" onClick={onReview}>
          Review record
        </button>
        <button className="btn primary" onClick={onHandoff}>
          Hand off
        </button>
      </div>
    </section>
  );
}

function SaySheet({ record, append, onClose, onTap }: { record: PinRecord; append: (e: PinEvent[]) => void; onClose: () => void; onTap: (k: FieldKey | null) => void }) {
  const engine = useSyncExternalStore(subscribeSpeechEngine, getSpeechEngine);
  const [last, setLast] = useState<{ text: string; t: number; via: 'voice' | 'tap'; sugg: Suggestion[] } | null>(null);
  const [confirmed, setConfirmed] = useState<FieldKey[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  const heard = (text: string, via: 'voice' | 'tap', t = Date.now()) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setLast({ text: '', t, via, sugg: [] });
      return;
    }
    append([{ k: 'say', t, text: trimmed, via }]);
    setLast({ text: trimmed, t, via, sugg: extract(trimmed) });
    setConfirmed([]);
  };

  const pttDown = async () => {
    if (!engine || busy) return;
    stopSpeaking();
    setListening(true);
    await engine.start();
  };
  const pttUp = async () => {
    if (!engine || !listening) return;
    setListening(false);
    setBusy(true);
    const t = Date.now();
    try {
      heard(await engine.stop(), 'voice', t);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet">
      <div className="sheet-head">
        <h3>Talk</h3>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </div>
      {engine && (
        <button
          className={`btn ptt ${listening ? 'live' : ''}`}
          onPointerDown={pttDown}
          onPointerUp={pttUp}
          onPointerLeave={pttUp}
          onContextMenu={(e) => e.preventDefault()}
          disabled={busy}
        >
          {busy ? 'Transcribing on this device…' : listening ? 'Listening… release to finish' : 'Hold to talk'}
        </button>
      )}
      <div className="transcript">
        {last ? (
          last.text ? (
            <>
              <q>{last.text}</q>
              <span className="transcript-meta">
                {last.via === 'voice' ? 'said' : 'quick phrase'} at {clock(last.t)}
              </span>
            </>
          ) : (
            <span className="muted">Nothing heard.</span>
          )
        ) : (
          <span className="muted">{engine ? 'Hold to talk, or tap a quick phrase.' : 'Tap a quick phrase.'}</span>
        )}
      </div>
      {last && (
        <div className="chips">
          {last.sugg.length ? (
            last.sugg.map((s) => {
              const done = confirmed.includes(s.key);
              const prev = record.fields[s.key];
              return (
                <button
                  key={s.key}
                  className={`chip ${done ? 'done' : ''}`}
                  disabled={done}
                  onClick={() => {
                    append([confirmSuggestion(s, last)]);
                    setConfirmed((c) => [...c, s.key]);
                  }}
                >
                  <span className="chip-k">{FIELD_LABELS[s.key]}</span>
                  <span className="chip-v">{s.value}</span>
                  <span className="chip-a">{done ? 'Recorded' : prev && prev.value !== s.value ? `Tap to replace ${prev.value}` : 'Tap to record'}</span>
                </button>
              );
            })
          ) : (
            <button className="chip miss" onClick={() => onTap(null)}>
              Didn't catch that. Tap instead?
            </button>
          )}
        </div>
      )}
      <div className="quick">
        {QUICK_PHRASES.map((p) => (
          <button key={p} className="btn quick-btn" onClick={() => heard(p, 'tap')}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function AskSheet({ append, onClose }: { append: (e: PinEvent[]) => void; onClose: () => void }) {
  const engine = useSyncExternalStore(subscribeSpeechEngine, getSpeechEngine);
  const [shown, setShown] = useState<{ q: string; a: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  const show = (q: string, a: string, matched: Answer | null) => {
    append([{ k: 'ask', t: Date.now(), q: matched ? matched.id : null, text: q }]);
    setShown({ q, a });
    speakLocal(a);
  };

  return (
    <div className="sheet">
      <div className="sheet-head">
        <h3>Ask</h3>
        <button
          className="btn ghost small"
          onClick={() => {
            stopSpeaking();
            onClose();
          }}
        >
          Close
        </button>
      </div>
      {shown ? (
        <div className="answer">
          <div className="answer-q">{shown.q}</div>
          <div className="answer-a">{shown.a}</div>
          <div className="answer-src">{shown.a === FALLBACK_ANSWER ? 'No vetted answer' : 'Vetted answer · ' + PROTOCOL_LABEL}</div>
          <button className="btn secondary" onClick={() => setShown(null)}>
            Ask another
          </button>
        </div>
      ) : (
        <>
          {engine && (
            <button
              className={`btn ptt ${listening ? 'live' : ''}`}
              disabled={busy}
              onPointerDown={async () => {
                if (busy) return;
                stopSpeaking();
                setListening(true);
                await engine.start();
              }}
              onPointerUp={async () => {
                if (!listening) return;
                setListening(false);
                setBusy(true);
                try {
                  const text = (await engine.stop()).trim();
                  const r = answerFor(text);
                  show(text || '(nothing heard)', text ? r.answer : FALLBACK_ANSWER, r.matched ?? null);
                } finally {
                  setBusy(false);
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {busy ? 'Transcribing on this device…' : listening ? 'Listening…' : 'Hold to ask'}
            </button>
          )}
          <div className="questions">
            {ANSWERS.map((a) => (
              <button key={a.id} className="btn quick-btn q" onClick={() => show(a.question, a.answer, a)}>
                {a.question}
              </button>
            ))}
            <button className="btn quick-btn q other" onClick={() => show('Something else', FALLBACK_ANSWER, null)}>
              Something else
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TapPicker({
  initial,
  record,
  onPick,
  onClose,
}: {
  initial: FieldKey | null;
  record: PinRecord;
  onPick: (k: FieldKey, v: string) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState<FieldKey | null>(initial);
  return (
    <div className="sheet">
      <div className="sheet-head">
        <h3>{key ? FIELD_LABELS[key] : 'Tap to record'}</h3>
        <button className="btn ghost small" onClick={key && !initial ? () => setKey(null) : onClose}>
          {key && !initial ? 'Back' : 'Close'}
        </button>
      </div>
      <div className="quick">
        {key
          ? TAP_CHOICES[key].map((v) => (
              <button key={v} className={`btn quick-btn ${record.fields[key]?.value === v ? 'on' : ''}`} onClick={() => onPick(key, v)}>
                {v}
              </button>
            ))
          : FIELD_KEYS.map((k) => (
              <button key={k} className="btn quick-btn" onClick={() => setKey(k)}>
                {FIELD_LABELS[k]}
                {record.fields[k] && <span className="muted"> · {record.fields[k]!.value}</span>}
              </button>
            ))}
      </div>
    </div>
  );
}

function ReviewScreen({
  record,
  ended,
  onEdit,
  onBack,
  onHandoff,
}: {
  record: PinRecord;
  ended: boolean;
  onEdit: (k: FieldKey) => void;
  onBack: () => void;
  onHandoff: () => void;
}) {
  return (
    <section className="review">
      <h2>Record</h2>
      <Reminders record={record} onAdd={onEdit} />
      <ul className="fields">
        {FIELD_KEYS.map((k) => {
          const f = record.fields[k];
          return (
            <li key={k} className={`field ${f ? '' : 'missing'}`}>
              <div className="field-row">
                <span className="field-k">{FIELD_LABELS[k]}</span>
                <button className="btn ghost small" onClick={() => onEdit(k)}>
                  {f ? 'Edit' : 'Add'}
                </button>
              </div>
              <div className="field-v">{f ? f.value + (k === 'tourniquet' && record.tqAt ? ` at ${clock(record.tqAt)}` : '') : 'Not recorded'}</div>
              {f && <SourceTag entry={f} />}
            </li>
          );
        })}
      </ul>
      <h3>Steps</h3>
      <ol className="timeline">
        {record.steps.map((s, i) => {
          const st = getStep(s.id)!;
          const label = s.out === 'unsure' ? 'Not sure' : st.options?.find((o) => o.id === s.out)?.label ?? 'Done';
          return (
            <li key={i}>
              <span className="tl-t">{clock(s.t)}</span> {st.title} · <em>{label}</em>
            </li>
          );
        })}
      </ol>
      <div className="review-actions">
        <button className="btn secondary" onClick={onBack}>
          {ended ? 'Back' : 'Back to protocol'}
        </button>
        <button className="btn primary" onClick={onHandoff}>
          Hand off
        </button>
      </div>
    </section>
  );
}

function HandoffScreen({
  events,
  record,
  onConfirm,
  onAdd,
  onBack,
  onNewDemo,
}: {
  events: PinEvent[];
  record: PinRecord;
  onConfirm: () => void;
  onAdd: (k: FieldKey) => void;
  onBack: () => void;
  onNewDemo: () => void;
}) {
  const [skipReminders, setSkipReminders] = useState(false);
  // A confirmation only counts if nothing changed after it.
  const lastChange = Math.max(...events.filter((e) => e.k === 'field' || e.k === 'step').map((e) => e.t), record.t0);
  const confirmed = record.confirmedAt !== undefined && record.confirmedAt >= lastChange;
  const enc = useMemo(() => (confirmed ? encodeRecord(record) : null), [confirmed, record]);
  const missing = missingReminders(record);

  if (missing.length && !skipReminders && !confirmed) {
    return (
      <section className="step">
        <div className="step-meta">Before you hand off</div>
        <Reminders record={record} onAdd={onAdd} />
        <div className="step-actions">
          <button className="btn secondary" onClick={onBack}>
            Review record
          </button>
          <button className="btn secondary" onClick={() => setSkipReminders(true)}>
            Hand off anyway
          </button>
        </div>
      </section>
    );
  }

  if (!confirmed || !enc) {
    return (
      <section className="step">
        <div className="step-meta">Responder confirmation</div>
        <h2 className="step-title small">This record matches what I saw and did.</h2>
        <p className="step-body">
          {HANDOFF_FROM} → {HANDOFF_TO}
        </p>
        <div className="step-actions">
          <button className="btn primary" onClick={onConfirm}>
            Confirm and show code
          </button>
          <button className="btn secondary" onClick={onBack}>
            Review record
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="handoff">
      <QrCode payload={enc.payload} className="qr" />
      <div className="handoff-size">Whole record: {enc.compressedBytes} bytes</div>
      <div className="handoff-to">Show this to the {HANDOFF_TO.replace('Receiving crew: ', 'receiving crew: ')}</div>
      <div className="review-actions">
        <button className="btn secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn primary" onClick={onNewDemo}>
          New demo
        </button>
      </div>
    </section>
  );
}
