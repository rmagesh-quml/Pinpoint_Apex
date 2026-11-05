// Demo protocol: severe bleeding. Adapted from public bystander
// bleeding-control education. Demo protocol · pending medical review.
// Do not add clinical content here that is not in the source material.

export const PROTOCOL_LABEL = 'Demo protocol · pending medical review';
export const PROTOCOL_NAME = 'Severe bleeding';

export type StepOption = {
  id: string;
  label: string;
  /** Step to go to next; 'end' finishes the protocol. Defaults to the following step. */
  next?: string;
};

export type Step = {
  id: string;
  title: string;
  body: string;
  /** Answer buttons, shown in place of the plain Done button. */
  options?: StepOption[];
  /** Marking this step Done starts the tourniquet clock. */
  startsTourniquetClock?: boolean;
};

export const STEPS: Step[] = [
  {
    id: 'help',
    title: 'Call for help',
    body: 'Call 911, or send someone to get help.',
  },
  {
    id: 'pressure',
    title: 'Apply firm, direct pressure',
    body: 'Push hard on the wound with both hands.',
    options: [
      { id: 'still', label: 'Still bleeding', next: 'pack' },
      { id: 'controlled', label: 'Bleeding controlled', next: 'hold' },
    ],
  },
  {
    id: 'pack',
    title: 'Pack the wound if trained',
    body: 'Pack it with gauze or clean cloth, then keep pressing.',
    options: [
      { id: 'packed', label: 'Packed', next: 'tq' },
      { id: 'not-trained', label: 'Not trained', next: 'tq' },
    ],
  },
  {
    id: 'tq',
    title: 'Apply a tourniquet',
    body: '2 to 3 inches above the wound. Not on a joint.',
    startsTourniquetClock: true,
  },
  {
    id: 'tighten',
    title: 'Tighten until the bleeding stops',
    body: 'Keep tightening until the bleeding stops.',
  },
  {
    id: 'time',
    title: 'Note the time',
    body: 'Pinpoint noted the time the tourniquet went on.',
  },
  {
    id: 'leave',
    title: 'Never loosen or remove it',
    body: 'Leave the tourniquet on. EMS will manage it.',
    // Last step of the tourniquet branch.
    options: [{ id: 'done', label: 'Done', next: 'end' }],
  },
  {
    id: 'hold',
    title: 'Keep firm, direct pressure',
    body: 'Keep pressing until help arrives.',
    options: [{ id: 'done', label: 'Done', next: 'end' }],
  },
];

export const STEP_INDEX: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.id, i]));

export function getStep(id: string): Step | undefined {
  const i = STEP_INDEX[id];
  return i === undefined ? undefined : STEPS[i];
}

/** Which step follows `stepId` when the responder chose `outcome`. */
export function nextStepId(stepId: string, outcome: string): string | 'end' {
  const step = getStep(stepId);
  if (!step) return 'end';
  const opt = step.options?.find((o) => o.id === outcome);
  if (opt?.next) return opt.next;
  // 'done' / 'unsure' on a plain step: go to the following step in order.
  const next = STEPS[STEP_INDEX[stepId] + 1];
  return next ? next.id : 'end';
}

export type Location = { id: string; label: string; scenario: string };

export const LOCATIONS: Location[] = [
  {
    id: 'pp',
    label: 'Pandapas Pond, Brush Mountain trails',
    scenario:
      'Mountain biker crash on the Brush Mountain trails near Pandapas Pond, Jefferson National Forest, about 15 minutes from campus. No cell signal on the trail. Deep cut to the left thigh with heavy bleeding.',
  },
  {
    id: 'cs',
    label: 'Cascades trail, Giles County',
    scenario: 'Hiker fall on the Cascades trail, Giles County.',
  },
];

export const HANDOFF_FROM = 'Trail rescue team';
export const HANDOFF_TO = 'Receiving crew: Blacksburg-area rescue squad (demo)';

export function getLocation(id: string): Location {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}
