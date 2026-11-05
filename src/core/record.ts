// Record builder: event log -> patient record. No free text, nothing generated.
import type { PinEvent, Via } from './events';
import { FIELD_KEYS, REQUIRED_FIELDS, type FieldKey } from './fields';
import { nextStepId, STEPS } from './protocol';

export type FieldEntry = {
  value: string;
  /** When it was confirmed (tap time). */
  t: number;
  via: Via;
  /** Exact words it came from, if any. */
  said?: string;
  saidT?: number;
  /** Set if the value was edited in review. */
  editedT?: number;
};

export type StepEntry = { id: string; out: string; t: number };

export type PinRecord = {
  v: 1;
  id: string;
  loc: string;
  t0: number;
  steps: StepEntry[];
  fields: Partial<Record<FieldKey, FieldEntry>>;
  tqAt?: number;
  endedAt?: number;
  confirmedAt?: number;
};

export function emptyRecord(): PinRecord {
  return { v: 1, id: '', loc: 'pp', t0: 0, steps: [], fields: {} };
}

export function buildRecord(events: readonly PinEvent[]): PinRecord {
  const r = emptyRecord();
  for (const e of events) {
    switch (e.k) {
      case 'start':
        r.id = e.id;
        r.loc = e.loc;
        r.t0 = e.t;
        break;
      case 'step': {
        r.steps.push({ id: e.step, out: e.out, t: e.t });
        break;
      }
      case 'field': {
        const prev = r.fields[e.key];
        if (e.via === 'edit' && prev) {
          r.fields[e.key] = { ...prev, value: e.value, editedT: e.t };
        } else {
          r.fields[e.key] = { value: e.value, t: e.t, via: e.via, said: e.said, saidT: e.saidT };
        }
        break;
      }
      case 'end':
        r.endedAt = e.t;
        break;
      case 'confirm':
        r.confirmedAt = e.t;
        break;
    }
  }
  r.tqAt = tourniquetTime(r);
  return r;
}

/**
 * When the tourniquet went on: the tap on the tourniquet step's Done (which
 * starts the clock), or else when "tourniquet on" was said.
 */
export function tourniquetTime(r: Pick<PinRecord, 'steps' | 'fields'>): number | undefined {
  const tq = r.steps.find((s) => s.out === 'done' && STEPS.find((x) => x.id === s.id)?.startsTourniquetClock);
  if (tq) return tq.t;
  const f = r.fields.tourniquet;
  return f ? f.saidT ?? f.t : undefined;
}

/** Current protocol step id for an event log, or 'end' when finished. */
export function currentStep(events: readonly PinEvent[]): string | 'end' {
  let cur: string | 'end' = STEPS[0].id;
  for (const e of events) {
    if (e.k === 'step' && e.step === cur) cur = nextStepId(e.step, e.out);
    if (e.k === 'end') cur = 'end';
  }
  return cur;
}

export function missingReminders(r: PinRecord): string[] {
  return REQUIRED_FIELDS.filter((req) => req.keys.some((k) => !r.fields[k])).map((req) => req.reminder);
}

export function recordedFields(r: PinRecord): FieldKey[] {
  return FIELD_KEYS.filter((k) => r.fields[k]);
}
