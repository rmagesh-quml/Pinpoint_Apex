// Record fields Pinpoint can fill. Order is the order they appear in the report.
export type FieldKey =
  | 'patient'
  | 'injury'
  | 'bodyLoc'
  | 'bleeding'
  | 'tourniquet'
  | 'pulse'
  | 'breathing'
  | 'response';

export const FIELD_KEYS: FieldKey[] = [
  'patient',
  'injury',
  'bodyLoc',
  'bleeding',
  'tourniquet',
  'pulse',
  'breathing',
  'response',
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  patient: 'Patient',
  injury: 'Injury',
  bodyLoc: 'Location on body',
  bleeding: 'Bleeding',
  tourniquet: 'Tourniquet',
  pulse: 'Pulse',
  breathing: 'Breathing',
  response: 'Level of response',
};

/** Fields that trigger a reminder before handoff if still missing. */
export const REQUIRED_FIELDS: { keys: FieldKey[]; reminder: string }[] = [
  { keys: ['pulse', 'breathing'], reminder: 'Vitals not recorded yet' },
  { keys: ['response'], reminder: 'Level of response not recorded yet' },
];

/** Fixed choices offered when the responder taps instead of talking. */
export const TAP_CHOICES: Record<FieldKey, string[]> = {
  patient: ['Male, adult', 'Female, adult', 'Child'],
  injury: ['Deep cut', 'Cut', 'Puncture wound'],
  bodyLoc: ['Left thigh', 'Right thigh', 'Left arm', 'Right arm', 'Left leg', 'Right leg'],
  bleeding: ['Heavy', 'Spurting', 'Controlled'],
  tourniquet: ['Applied'],
  pulse: ['60 /min', '80 /min', '100 /min', '110 /min', '120 /min', '140 /min'],
  breathing: ['Normal', 'Fast', 'Slow', 'Shallow'],
  response: ['Alert', 'Responds to voice', 'Responds to pain', 'Unresponsive'],
};
