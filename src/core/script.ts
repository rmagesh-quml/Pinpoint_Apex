// Scripted Pandapas Pond run used by the monitors' attract modes. It is fed
// through the same extractor and record builder as the phone, not a video.
import { answerFor, getAnswer } from './answers';
import type { PinEvent } from './events';
import { extract } from './extract';
import type { FieldKey } from './fields';

export type ScriptAction =
  | { at: number; kind: 'say'; text: string; confirm: FieldKey[] }
  | { at: number; kind: 'step'; step: string; out: string }
  | { at: number; kind: 'ask'; q: string }
  | { at: number; kind: 'handoff' };

/** Seconds from the start of the loop. Total loop is about 75 s. */
export const PANDAPAS_SCRIPT: ScriptAction[] = [
  { at: 3, kind: 'say', text: 'Mountain biker crashed. Male, about 20 years old. Deep cut to the left thigh, heavy bleeding.', confirm: ['patient', 'injury', 'bodyLoc', 'bleeding'] },
  { at: 10, kind: 'step', step: 'help', out: 'done' },
  { at: 16, kind: 'step', step: 'pressure', out: 'still' },
  { at: 22, kind: 'step', step: 'pack', out: 'packed' },
  { at: 28, kind: 'say', text: "Tourniquet is on, high on the thigh, above the cut.", confirm: ['tourniquet'] },
  { at: 31, kind: 'step', step: 'tq', out: 'done' },
  { at: 36, kind: 'step', step: 'tighten', out: 'done' },
  { at: 40, kind: 'step', step: 'time', out: 'done' },
  { at: 45, kind: 'ask', q: 'loosen' },
  { at: 52, kind: 'say', text: 'Pulse is 118. Breathing fast.', confirm: ['pulse', 'breathing'] },
  { at: 58, kind: 'say', text: "He's alert and talking to me.", confirm: ['response'] },
  { at: 63, kind: 'step', step: 'leave', out: 'done' },
  { at: 66, kind: 'handoff' },
];
export const SCRIPT_LENGTH_S = 75;

/**
 * Turn one script action into events, using the real extractor. A field is
 * only confirmed if the extractor actually suggested it.
 */
export function actionEvents(a: ScriptAction, t: number): PinEvent[] {
  switch (a.kind) {
    case 'say': {
      const out: PinEvent[] = [{ k: 'say', t, text: a.text, via: 'voice' }];
      const sugg = extract(a.text);
      for (const key of a.confirm) {
        const s = sugg.find((x) => x.key === key);
        if (s) out.push({ k: 'field', t: t + 2000, key, value: s.value, via: 'voice', said: a.text, saidT: t });
      }
      return out;
    }
    case 'step':
      return [{ k: 'step', t, step: a.step, out: a.out }];
    case 'ask': {
      const q = getAnswer(a.q);
      return [{ k: 'ask', t, q: q ? q.id : null, text: q?.question }];
    }
    case 'handoff':
      return [{ k: 'end', t }, { k: 'confirm', t: t + 1000 }];
  }
}

/** Full event log for the script, starting at t0 (ms). */
export function scriptEvents(t0: number, loc = 'pp', id = 'demo01'): PinEvent[] {
  const ev: PinEvent[] = [{ k: 'start', t: t0, id, loc }];
  for (const a of PANDAPAS_SCRIPT) ev.push(...actionEvents(a, t0 + a.at * 1000));
  return ev;
}

export { answerFor };
