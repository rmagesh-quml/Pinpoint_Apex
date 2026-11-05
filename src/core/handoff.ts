// QR handoff: record -> compact JSON -> fflate deflate -> base64url, and back.
// The phone never talks to the monitors over a network; this string is the
// whole record and travels as a QR code.
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { FIELD_KEYS, type FieldKey } from './fields';
import type { Via } from './events';
import { STEPS } from './protocol';
import { tourniquetTime, type FieldEntry, type PinRecord } from './record';

export const QR_PREFIX = 'PP1.';
const VIAS: Via[] = ['voice', 'tap', 'step', 'edit'];

type Compact = {
  v: 1;
  i: string;
  l: string;
  t: number; // t0, unix seconds
  s: [number, string, number][]; // step index, outcome, dt
  f: (string | number)[][]; // field index, value, dt, via, saidIdx(-1), saidDt, editedDt(-1)
  u: string[]; // unique source utterances
  e?: number;
  c?: number;
};

const sec = (ms: number) => Math.round(ms / 1000);

export function toCompact(r: PinRecord): Compact {
  const t0 = sec(r.t0);
  const dt = (ms: number) => sec(ms) - t0;
  const u: string[] = [];
  const uIdx = (s?: string) => {
    if (s === undefined) return -1;
    let i = u.indexOf(s);
    if (i < 0) i = u.push(s) - 1;
    return i;
  };
  const f: Compact['f'] = [];
  FIELD_KEYS.forEach((k, ki) => {
    const e = r.fields[k];
    if (!e) return;
    f.push([
      ki,
      e.value,
      dt(e.t),
      VIAS.indexOf(e.via),
      uIdx(e.said),
      e.saidT !== undefined ? dt(e.saidT) : 0,
      e.editedT !== undefined ? dt(e.editedT) : -1,
    ]);
  });
  const c: Compact = {
    v: 1,
    i: r.id,
    l: r.loc,
    t: t0,
    s: r.steps.map((s) => [STEPS.findIndex((x) => x.id === s.id), s.out, dt(s.t)]),
    f,
    u,
  };
  if (r.endedAt !== undefined) c.e = dt(r.endedAt);
  if (r.confirmedAt !== undefined) c.c = dt(r.confirmedAt);
  return c;
}

export function fromCompact(c: Compact): PinRecord {
  if (c.v !== 1) throw new Error('Unsupported record version');
  const at = (d: number) => (c.t + d) * 1000;
  const fields: PinRecord['fields'] = {};
  for (const [ki, value, d, via, si, sd, ed] of c.f as [number, string, number, number, number, number, number][]) {
    const key: FieldKey | undefined = FIELD_KEYS[ki];
    if (!key) continue;
    const entry: FieldEntry = { value, t: at(d), via: VIAS[via] ?? 'tap' };
    if (si >= 0) {
      entry.said = c.u[si];
      entry.saidT = at(sd);
    }
    if (ed >= 0) entry.editedT = at(ed);
    fields[key] = entry;
  }
  const steps = c.s
    .filter(([i]) => STEPS[i])
    .map(([i, out, d]) => ({ id: STEPS[i].id, out, t: at(d) }));
  const r: PinRecord = { v: 1, id: c.i, loc: c.l, t0: at(0), steps, fields };
  r.tqAt = tourniquetTime(r);
  if (c.e !== undefined) r.endedAt = at(c.e);
  if (c.c !== undefined) r.confirmedAt = at(c.c);
  return r;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type Encoded = { payload: string; compressedBytes: number; jsonBytes: number };

export function encodeRecord(r: PinRecord): Encoded {
  const json = strToU8(JSON.stringify(toCompact(r)));
  const deflated = deflateSync(json, { level: 9 });
  return { payload: QR_PREFIX + toBase64Url(deflated), compressedBytes: deflated.length, jsonBytes: json.length };
}

export function decodeRecord(payload: string): { record: PinRecord; compressedBytes: number } {
  if (!payload.startsWith(QR_PREFIX)) throw new Error('Not a Pinpoint record');
  const bytes = fromBase64Url(payload.slice(QR_PREFIX.length));
  const c = JSON.parse(strFromU8(inflateSync(bytes))) as Compact;
  return { record: fromCompact(c), compressedBytes: bytes.length };
}
