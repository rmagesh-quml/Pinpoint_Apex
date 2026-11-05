// Fixed report wording for protocol steps. The report is rendered only from
// the record plus these fixed strings: nothing free-typed, nothing generated.
import { getStep } from './protocol';
import type { StepEntry } from './record';

const INTERVENTION: Record<string, Record<string, string>> = {
  help: { done: 'Help called' },
  pressure: { still: 'Direct pressure · still bleeding', controlled: 'Direct pressure · bleeding controlled' },
  pack: { packed: 'Wound packed', 'not-trained': 'Wound not packed (not trained)' },
  tq: { done: 'Tourniquet applied' },
  tighten: { done: 'Tightened until bleeding stopped' },
  time: { done: 'Tourniquet time noted' },
  leave: { done: 'Tourniquet left on for EMS' },
  hold: { done: 'Direct pressure held' },
};

export function interventionLabel(s: StepEntry): string {
  const step = getStep(s.id);
  if (s.out === 'unsure') return `${step?.title ?? s.id} · responder not sure`;
  return INTERVENTION[s.id]?.[s.out] ?? step?.title ?? s.id;
}
