// Speech spike: measure whisper-tiny.en on the S25 in airplane mode.
// 1) Online: tap Load once to download and cache the model.
// 2) Airplane mode: reload, tap Load (measures cached load), then hold to talk
//    a few times. Each run shows seconds from release to transcript.
import { useRef, useState } from 'react';
import { extract } from '../core/extract';
import { FIELD_LABELS } from '../core/fields';
import { DemoLabel } from '../components/DemoLabel';
import { ProofBadges } from '../components/ProofBadges';
import { useOnline } from '../lib/online';
import { Recorder, WHISPER_MODEL, loadWhisper, setVoicePreferred, transcribe, voicePreferred, type LoadProgress } from '../lib/whisper';

type Run = { text: string; audioS: number; latencyS: number; fields: string };

const TRY_LINES = ['Deep cut to the left thigh, heavy bleeding', "Tourniquet's on", 'Pulse is 118, breathing fast', "He's alert and talking to me"];

export function Spike() {
  const online = useOnline();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [loads, setLoads] = useState<{ ms: number; online: boolean }[]>([]);
  const [progress, setProgress] = useState<Record<string, LoadProgress>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [rec] = useState(() => new Recorder());
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [useIt, setUseIt] = useState(voicePreferred());
  const downAt = useRef(0);

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      const { loadMs } = await loadWhisper((p) => setProgress((prev) => ({ ...prev, [p.file]: p })));
      setLoads((l) => [...l, { ms: loadMs, online: navigator.onLine }]);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const down = async () => {
    if (status !== 'ready' || busy) return;
    try {
      await rec.start();
      downAt.current = performance.now();
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const up = async () => {
    if (!listening) return;
    setListening(false);
    setBusy(true);
    try {
      const t = performance.now();
      const audio = await rec.stop();
      const text = await transcribe(audio);
      const latencyS = (performance.now() - t) / 1000;
      const fields = extract(text).map((s) => `${FIELD_LABELS[s.key]}: ${s.value}`).join(' · ') || "Didn't catch that";
      setRuns((r) => [...r, { text, audioS: audio.length / 16000, latencyS, fields }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const lat = runs.map((r) => r.latencyS).sort((a, b) => a - b);
  const median = lat.length ? lat[Math.floor(lat.length / 2)] : undefined;
  const max = lat.length ? lat[lat.length - 1] : undefined;
  const totalMB = Object.values(progress).reduce((s, p) => s + p.total, 0) / 1e6;

  const report = [
    `Speech spike: ${WHISPER_MODEL}, wasm, q8`,
    `Device: ${navigator.userAgent}`,
    `Model loads: ${loads.map((l) => `${(l.ms / 1000).toFixed(1)} s (${l.online ? 'online' : 'offline'})`).join(', ') || 'none'}`,
    `Runs: ${runs.length}, release→transcript median ${median?.toFixed(2) ?? '-'} s, max ${max?.toFixed(2) ?? '-'} s`,
    ...runs.map((r, i) => `  ${i + 1}. ${r.latencyS.toFixed(2)} s for ${r.audioS.toFixed(1)} s audio: "${r.text}" → ${r.fields}`),
  ].join('\n');

  return (
    <main className="spike">
      <h1>Speech spike</h1>
      <ProofBadges />
      <p className="muted">
        {WHISPER_MODEL} in the browser. First load online to cache it, then switch on airplane mode, reload this page and measure.
        {totalMB > 0 && ` Downloaded files: ${totalMB.toFixed(1)} MB.`}
      </p>

      <button className="btn primary" onClick={load} disabled={status === 'loading'}>
        {status === 'loading' ? 'Loading model…' : status === 'ready' ? 'Model ready · load again to time it' : `1. Load model (${online ? 'online' : 'offline'})`}
      </button>
      {status === 'loading' &&
        Object.values(progress).map((p) => (
          <div key={p.file} className="muted small">
            {p.file}: {p.total ? Math.round((100 * p.loaded) / p.total) : 0}%
          </div>
        ))}

      <button
        className={`btn ptt ${listening ? 'live' : ''}`}
        disabled={status !== 'ready' || busy}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onContextMenu={(e) => e.preventDefault()}
      >
        {busy ? 'Transcribing…' : listening ? 'Listening… release to finish' : '2. Hold to talk'}
      </button>
      <p className="muted small">Try: {TRY_LINES.map((l) => `“${l}”`).join(' · ')}</p>

      {error && <div className="reminder">{error}</div>}

      <pre className="spike-report">{report}</pre>
      <div className="review-actions">
        <button className="btn secondary" onClick={() => navigator.clipboard?.writeText(report)}>
          Copy results
        </button>
        <button
          className={`btn ${useIt ? 'primary' : 'secondary'}`}
          onClick={() => {
            setVoicePreferred(!useIt);
            setUseIt(!useIt);
          }}
        >
          {useIt ? 'Voice on for /phone' : 'Use voice on /phone'}
        </button>
      </div>
      <p className="muted small">
        Go/no-go: use voice only if release→transcript stays under about 4 s in airplane mode. Otherwise leave it off and the phone uses taps and
        quick phrases.
      </p>
      <DemoLabel inline />
    </main>
  );
}
