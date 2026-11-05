import { describe, expect, it } from 'vitest';
import { answerFor, FALLBACK_ANSWER } from './answers';
import { extract } from './extract';
import { decodeRecord, encodeRecord } from './handoff';
import { buildRecord, currentStep, missingReminders } from './record';
import { PANDAPAS_SCRIPT, scriptEvents } from './script';

const get = (text: string) => Object.fromEntries(extract(text).map((s) => [s.key, s.value]));

describe('extractor', () => {
  it('pulls injury, body location and bleeding from the scenario line', () => {
    expect(get('Deep cut to the left thigh with heavy bleeding')).toEqual({
      injury: 'Deep cut',
      bodyLoc: 'Left thigh',
      bleeding: 'Heavy',
    });
  });

  it('reads vitals as digits and words', () => {
    expect(get('Pulse is 118, breathing fast')).toEqual({ pulse: '118 /min', breathing: 'Fast' });
    expect(get('heart rate about 96 and respiratory rate 22')).toEqual({ pulse: '96 /min', breathing: '22 /min' });
  });

  it('reads tourniquet applied and level of response', () => {
    expect(get("Tourniquet's on")).toEqual({ tourniquet: 'Applied' });
    expect(get('I applied a tourniquet')).toEqual({ tourniquet: 'Applied' });
    expect(get("He's alert")).toEqual({ response: 'Alert' });
    expect(get('He is unconscious')).toEqual({ response: 'Unresponsive' });
  });

  it('does not suggest negated facts', () => {
    expect(get('tourniquet is not on yet')).toEqual({});
    expect(get("there's no heavy bleeding")).toEqual({});
  });

  it('prefers controlled over heavy bleeding', () => {
    expect(get('heavy bleeding has stopped, bleeding is controlled').bleeding).toBe('Controlled');
  });

  it('never guesses: unrelated words give nothing', () => {
    expect(extract('hold on a second')).toEqual([]);
    expect(extract('')).toEqual([]);
    expect(get('pulse is fast')).toEqual({});
  });

  it('does not take tourniquet placement as the wound location', () => {
    expect(get('above the knee')).toEqual({});
  });
});

describe('answer bank', () => {
  it('matches vetted questions and falls back otherwise', () => {
    expect(answerFor('Can I loosen the tourniquet?').answer).toMatch(/^No\. Leave it on/);
    expect(answerFor("What if I don't have a tourniquet").matched?.id).toBe('no-tq');
    expect(answerFor('Should I give him water?').answer).toBe(FALLBACK_ANSWER);
  });
});

describe('scripted run', () => {
  it('every scripted confirm is actually suggested by the extractor', () => {
    for (const a of PANDAPAS_SCRIPT) {
      if (a.kind !== 'say') continue;
      const keys = extract(a.text).map((s) => s.key);
      for (const k of a.confirm) expect(keys, a.text).toContain(k);
    }
  });

  it('finishes the protocol with no reminders', () => {
    const ev = scriptEvents(Date.UTC(2026, 10, 9, 23, 10, 0));
    expect(currentStep(ev)).toBe('end');
    expect(missingReminders(buildRecord(ev))).toEqual([]);
  });
});

describe('QR encode/decode', () => {
  it('round-trips the scripted record and fits comfortably in one QR', () => {
    const r = buildRecord(scriptEvents(Date.UTC(2026, 10, 9, 23, 10, 0)));
    const enc = encodeRecord(r);
    expect(enc.compressedBytes).toBeLessThan(1500);
    const dec = decodeRecord(enc.payload);
    expect(dec.compressedBytes).toBe(enc.compressedBytes);
    expect(dec.record).toEqual(r);
  });

  it('keeps edits and tap-sourced fields', () => {
    const t0 = Date.UTC(2026, 10, 9, 23, 0, 0);
    const r = buildRecord([
      { k: 'start', t: t0, id: 'x1', loc: 'cs' },
      { k: 'field', t: t0 + 5000, key: 'pulse', value: '110 /min', via: 'tap' },
      { k: 'say', t: t0 + 9000, text: 'breathing fast', via: 'voice' },
      { k: 'field', t: t0 + 10000, key: 'breathing', value: 'Fast', via: 'voice', said: 'breathing fast', saidT: t0 + 9000 },
      { k: 'field', t: t0 + 20000, key: 'breathing', value: 'Normal', via: 'edit' },
    ]);
    expect(r.fields.breathing).toMatchObject({ value: 'Normal', said: 'breathing fast', editedT: t0 + 20000 });
    expect(decodeRecord(encodeRecord(r).payload).record).toEqual(r);
    expect(missingReminders(r)).toEqual(['Level of response not recorded yet']);
  });

  it('rejects codes that are not Pinpoint records', () => {
    expect(() => decodeRecord('https://example.com')).toThrow();
  });
});

describe('engine', async () => {
  const { startEvents, stepEvents } = await import('./engine');
  it('records the tourniquet from the Done tap and ends after the last step', () => {
    let ev = startEvents('pp', 1000_000);
    const go = (step: string, out: string, t: number) => (ev = [...ev, ...stepEvents(ev, step, out, t)]);
    go('help', 'done', 1001_000);
    go('pressure', 'unsure', 1002_000);
    expect(currentStep(ev)).toBe('pack');
    go('pack', 'not-trained', 1003_000);
    go('tq', 'done', 1004_000);
    const r = buildRecord(ev);
    expect(r.fields.tourniquet).toMatchObject({ value: 'Applied', via: 'step' });
    expect(r.tqAt).toBe(1004_000);
    go('tighten', 'done', 1005_000);
    go('time', 'done', 1006_000);
    go('leave', 'unsure', 1007_000);
    expect(currentStep(ev)).toBe('end');
    expect(buildRecord(ev).endedAt).toBe(1007_000);
  });
  it('ignores taps for a step that is not current', () => {
    const ev = startEvents('pp', 0);
    expect(stepEvents(ev, 'tq', 'done', 5)).toEqual([]);
  });
});
