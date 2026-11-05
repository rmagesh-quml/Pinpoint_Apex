// Append-only event log. The record is always rebuilt from these events.
import type { FieldKey } from './fields';

export type Via = 'voice' | 'tap' | 'step' | 'edit';

export type PinEvent =
  | { k: 'start'; t: number; id: string; loc: string }
  /** Something the responder said (voice) or a quick phrase they tapped. */
  | { k: 'say'; t: number; text: string; via: 'voice' | 'tap' }
  | { k: 'step'; t: number; step: string; out: string }
  /** A confirmed record field. `said`/`saidT` are the exact source words and when they were said. */
  | { k: 'field'; t: number; key: FieldKey; value: string; via: Via; said?: string; saidT?: number }
  | { k: 'ask'; t: number; q: string | null; text?: string }
  | { k: 'end'; t: number }
  | { k: 'confirm'; t: number };

export function newIncidentId(now = Date.now()): string {
  // Short, non-identifying id: time-based plus random suffix.
  return (now % 1e8).toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
}
