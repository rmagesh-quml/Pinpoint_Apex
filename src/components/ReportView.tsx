// Patient care report, rendered only from the record. `reveal` controls how
// many blocks are visible, so the report can assemble field by field.
import { FIELD_KEYS, FIELD_LABELS } from '../core/fields';
import { HANDOFF_FROM, HANDOFF_TO, getLocation, PROTOCOL_NAME } from '../core/protocol';
import type { PinRecord } from '../core/record';
import { interventionLabel } from '../core/report';
import { clock } from '../lib/time';
import { sourceLabel } from './SourceTag';

export function reportBlockCount(r: PinRecord): number {
  return 1 + FIELD_KEYS.length + r.steps.length + 1;
}

export function ReportView({ record, reveal, tag }: { record: PinRecord; reveal: number; tag: string }) {
  const loc = getLocation(record.loc);
  let i = 0;
  const vis = () => (i++ < reveal ? 'shown' : 'hidden');

  return (
    <div className="report">
      <div className="report-head">
        <div className="report-title">Patient care report</div>
        <div className="report-tag">{tag}</div>
      </div>

      <div className={`report-meta ${vis()}`}>
        <div className="meta">
          <div className="meta-k">Incident</div>
          <div className="meta-v">
            {loc.incident} · {PROTOCOL_NAME}
          </div>
        </div>
        <div className="meta">
          <div className="meta-k">Location</div>
          <div className="meta-v">{loc.label}</div>
        </div>
        <div className="meta">
          <div className="meta-k">Times</div>
          <div className="meta-v">
            Started {clock(record.t0)}
            {record.endedAt !== undefined && ` · Last step ${clock(record.endedAt)}`}
          </div>
        </div>
        <div className="meta wide">
          <div className="meta-k">Handoff</div>
          <div className="meta-v">
            {HANDOFF_FROM} → {HANDOFF_TO}
          </div>
        </div>
      </div>

      <div className="report-body">
        <div className="report-fields">
          {FIELD_KEYS.map((k) => {
            const f = record.fields[k];
            return (
              <div key={k} className={`rf ${f ? '' : 'missing'} ${vis()}`}>
                <div className="rf-k">
                  {FIELD_LABELS[k]}
                  {f && <span className="src-when"> · {sourceLabel(f)}</span>}
                  {f?.editedT !== undefined && <span className="src-edit"> · edited {clock(f.editedT)}</span>}
                </div>
                <div className="rf-v">
                  {f ? f.value : 'Not recorded'}
                  {f && k === 'tourniquet' && record.tqAt !== undefined && <span className="rf-at"> at {clock(record.tqAt)}</span>}
                </div>
                {f?.said && (
                  <div className="rf-src">
                    <q>{f.said}</q>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="report-steps">
          <div className="meta-k">Interventions</div>
          <ol>
            {record.steps.map((s, n) => (
              <li key={n} className={vis()}>
                <span className="iv-t">{clock(s.t)}</span>
                <span className="iv-l">{interventionLabel(s)}</span>
              </li>
            ))}
            {!record.steps.length && <li className="missing">Not recorded</li>}
          </ol>
        </div>
      </div>

      <div className={`report-confirm ${record.confirmedAt !== undefined ? 'ok' : 'missing'} ${vis()}`}>
        {record.confirmedAt !== undefined
          ? `Responder confirmed this record at ${clock(record.confirmedAt)}`
          : 'Responder confirmation: Not recorded'}
      </div>
    </div>
  );
}
