import type { FieldEntry } from '../core/record';
import { clock } from '../lib/time';

/** Where a record field came from: the exact words and when, or the tap. */
export function sourceLabel(e: FieldEntry): string {
  if (e.via === 'voice' && e.saidT !== undefined) return `said at ${clock(e.saidT)}`;
  if (e.via === 'tap' && e.said !== undefined && e.saidT !== undefined) return `quick phrase at ${clock(e.saidT)}`;
  if (e.via === 'step') return `step tapped at ${clock(e.t)}`;
  return `tapped at ${clock(e.t)}`;
}

export function SourceTag({ entry }: { entry: FieldEntry }) {
  return (
    <span className="source-tag">
      <span className="source-when">{sourceLabel(entry)}</span>
      {entry.said && <q className="source-words">{entry.said}</q>}
      {entry.editedT !== undefined && <span className="source-edit">edited at {clock(entry.editedT)}</span>}
    </span>
  );
}
