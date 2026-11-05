// Protocol engine shared by the phone and the scripted monitor runs.
// Every function returns new events to append; nothing is mutated.
import type { PinEvent } from './events';
import { newIncidentId } from './events';
import type { Suggestion } from './extract';
import { getStep, nextStepId } from './protocol';
import { buildRecord, currentStep } from './record';

export function startEvents(loc: string, t = Date.now()): PinEvent[] {
  return [{ k: 'start', t, id: newIncidentId(t), loc }];
}

/** Events for answering the current step. Ignores stale taps on other steps. */
export function stepEvents(events: readonly PinEvent[], stepId: string, out: string, t = Date.now()): PinEvent[] {
  if (currentStep(events) !== stepId) return [];
  const out_: PinEvent[] = [{ k: 'step', t, step: stepId, out }];
  const step = getStep(stepId);
  // Tapping Done on the tourniquet step records it, if it wasn't said already.
  if (step?.startsTourniquetClock && out === 'done' && !buildRecord(events).fields.tourniquet) {
    out_.push({ k: 'field', t, key: 'tourniquet', value: 'Applied', via: 'step' });
  }
  if (nextStepId(stepId, out) === 'end') out_.push({ k: 'end', t });
  return out_;
}

/** Confirming a voice/quick-phrase suggestion chip. */
export function confirmSuggestion(s: Suggestion, said: { text: string; t: number; via: 'voice' | 'tap' }, t = Date.now()): PinEvent {
  return { k: 'field', t, key: s.key, value: s.value, via: said.via === 'voice' ? 'voice' : 'tap', said: said.text, saidT: said.t };
}
