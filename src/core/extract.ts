// Phrase-rule extractor. Maps what the responder said to record-field
// suggestions. It never guesses: if no rule matches, it returns nothing and
// the UI says "Didn't catch that. Tap instead?". Suggestions only become part
// of the record when the responder taps to confirm them.
import type { FieldKey } from './fields';

export type Suggestion = { key: FieldKey; value: string };

const NEG = /\b(no|not|isn'?t|wasn'?t|without|never)\s+(\w+\s+){0,2}$/;

/** True if the match at `index` is preceded (within 3 words) by a negation. */
function negated(text: string, index: number): boolean {
  return NEG.test(text.slice(0, index));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Rule = (t: string) => Suggestion | undefined;

const SIDE = '(left|right)';
const PARTS =
  '(upper arm|forearm|arm|thigh|upper leg|lower leg|leg|calf|shin|knee|ankle|foot|hand|wrist|elbow|shoulder|hip|groin|neck|head|chest|abdomen|belly)';

const rules: Rule[] = [
  // Patient: sex and approximate age, only what was said.
  (t) => {
    const sexM = t.match(/\b(male|man|guy|boy|female|woman|girl)\b/);
    const ageM = t.match(/\b(about |around |maybe )?(\d{1,2})[- ]?(?:years?[- ]old|yo|year old)\b/);
    if (!sexM && !ageM) return undefined;
    const parts: string[] = [];
    if (sexM) parts.push(/^(male|man|guy|boy)$/.test(sexM[1]) ? 'Male' : 'Female');
    if (ageM) parts.push(`${ageM[1] ? 'about ' : ''}${ageM[2]} years`);
    return { key: 'patient', value: parts.join(', ') };
  },
  // Injury type.
  (t) => {
    const m = t.match(/\b(deep cut|deep laceration|laceration|gash|puncture|stab wound|cut)\b/);
    if (!m || negated(t, m.index!)) return undefined;
    const v = { 'deep cut': 'Deep cut', 'deep laceration': 'Deep cut', laceration: 'Deep cut', gash: 'Deep cut', puncture: 'Puncture wound', 'stab wound': 'Puncture wound', cut: 'Cut' }[m[1]]!;
    return { key: 'injury', value: v };
  },
  // Location on the body. Side is only included if it was said.
  (t) => {
    const m = t.match(new RegExp(`\\b(?:${SIDE}\\s+)?${PARTS}\\b`));
    if (!m) return undefined;
    // Ignore "above the knee" style phrases about tourniquet placement.
    if (/\b(above|below)\s+(the\s+)?$/.test(t.slice(0, m.index!))) return undefined;
    return { key: 'bodyLoc', value: cap(m[1] ? `${m[1]} ${m[2]}` : m[2]) };
  },
  // Bleeding type. "Stopped/controlled" wins over "heavy" if both appear.
  (t) => {
    if (/\b(bleeding|blood)\s+(has\s+|is\s+)?(stopped|controlled|under control)\b|\bno more bleeding\b|\bstopped bleeding\b/.test(t))
      return { key: 'bleeding', value: 'Controlled' };
    if (/\b(spurting|pulsing|squirting)\b/.test(t)) return { key: 'bleeding', value: 'Spurting' };
    const m = t.match(/\b(heavy|severe|bad|major|lots of|a lot of|massive)\s+(bleeding|bleed|blood)\b|\bbleeding (heavily|a lot|badly)\b/);
    if (m && !negated(t, m.index!)) return { key: 'bleeding', value: 'Heavy' };
    return undefined;
  },
  // Tourniquet applied.
  (t) => {
    const m = t.match(
      /\btourniquet('s| is)?\s+(is\s+)?(on|applied|placed|in place|tight)\b|\b(applied|placed|put|got)\s+(a|the)\s+tourniquet\b|\btourniquet\s+(going\s+)?on\b/,
    );
    if (!m || negated(t, m.index!)) return undefined;
    return { key: 'tourniquet', value: 'Applied' };
  },
  // Pulse / heart rate, digits only (never inferred).
  (t) => {
    const m = t.match(/\b(?:pulse|heart rate|hr)\s+(?:is\s+|of\s+|about\s+|around\s+|at\s+)*(\d{2,3})\b/);
    if (!m) return undefined;
    const n = Number(m[1]);
    if (n < 20 || n > 250) return undefined;
    return { key: 'pulse', value: `${n} /min` };
  },
  // Breathing: a rate or a description.
  (t) => {
    if (/\bnot breathing\b/.test(t)) return { key: 'breathing', value: 'Not breathing' };
    const r = t.match(/\b(?:breathing|resp(?:iratory)? rate|respirations?|breaths?)\s+(?:rate\s+)?(?:is\s+|of\s+|about\s+|around\s+|at\s+)*(\d{1,2})\b/);
    if (r) return { key: 'breathing', value: `${Number(r[1])} /min` };
    const d = t.match(/\bbreathing\s+(?:is\s+|seems\s+|looks\s+)?(fast|rapid|normal|okay|ok|fine|slow|shallow|labou?red)\b|\b(fast|rapid|normal|slow|shallow|labou?red)\s+breathing\b/);
    if (d) {
      const w = d[1] ?? d[2];
      const v = { fast: 'Fast', rapid: 'Fast', normal: 'Normal', okay: 'Normal', ok: 'Normal', fine: 'Normal', slow: 'Slow', shallow: 'Shallow', labored: 'Labored', laboured: 'Labored' }[w]!;
      return { key: 'breathing', value: v };
    }
    return undefined;
  },
  // Level of response (AVPU wording).
  (t) => {
    if (/\b(unresponsive|unconscious|not responding|not responsive|passed out)\b/.test(t))
      return { key: 'response', value: 'Unresponsive' };
    if (/\bresponds? (only )?to pain\b/.test(t)) return { key: 'response', value: 'Responds to pain' };
    if (/\bresponds? (only )?to (my |our )?voice\b/.test(t)) return { key: 'response', value: 'Responds to voice' };
    if (/\b(alert|awake and talking|talking to (me|us)|conscious and talking|he'?s talking|she'?s talking)\b/.test(t))
      return { key: 'response', value: 'Alert' };
    return undefined;
  },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns suggestions found in one utterance. Empty means "didn't catch that". */
export function extract(text: string): Suggestion[] {
  const t = normalize(text);
  if (!t) return [];
  const out: Suggestion[] = [];
  for (const rule of rules) {
    const s = rule(t);
    if (s) out.push(s);
  }
  return out;
}
