// On-device speech: whisper-tiny.en via transformers.js (ONNX, wasm backend).
// The model is downloaded once (online) and kept in the browser's Cache
// Storage by transformers.js; the ONNX runtime is served from /ort/ and cached
// by the service worker. Nothing is sent anywhere: audio stays in this tab.
import type { SpeechEngine } from './speech';

export const WHISPER_MODEL = 'Xenova/whisper-tiny.en';
const PREF_KEY = 'pinpoint.voice';

type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;

export type LoadProgress = { file: string; loaded: number; total: number };

let asrPromise: Promise<Asr> | null = null;

export async function loadWhisper(onProgress?: (p: LoadProgress) => void): Promise<{ loadMs: number }> {
  const t0 = performance.now();
  if (!asrPromise) {
    asrPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const wasm = env.backends.onnx.wasm!;
      wasm.wasmPaths = '/ort/';
      wasm.numThreads = 1;
      const asr = await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file) onProgress?.({ file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      });
      return asr as unknown as Asr;
    })();
    asrPromise.catch(() => {
      asrPromise = null;
    });
  }
  await asrPromise;
  return { loadMs: Math.round(performance.now() - t0) };
}

export async function transcribe(audio: Float32Array): Promise<string> {
  if (!asrPromise) throw new Error('Speech model not loaded');
  const asr = await asrPromise;
  const out = await asr(audio);
  const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
  return text.replace(/\[[^\]]*\]|\([^)]*\)/g, '').trim(); // drop "[BLANK_AUDIO]" style tags
}

/** Push-to-talk recorder: start() on press, stop() on release -> 16 kHz mono PCM. */
export class Recorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async start() {
    this.stream ??= await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start();
  }

  async stop(): Promise<Float32Array> {
    const rec = this.rec;
    if (!rec) return new Float32Array();
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    this.rec = null;
    const buf = await new Blob(this.chunks).arrayBuffer();
    if (!buf.byteLength) return new Float32Array();
    const ctx = new AudioContext({ sampleRate: 16000 });
    try {
      const audio = await ctx.decodeAudioData(buf);
      return audio.getChannelData(0);
    } finally {
      ctx.close();
    }
  }

  release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

export function whisperEngine(): SpeechEngine {
  const rec = new Recorder();
  return {
    name: 'whisper-tiny.en (on this device)',
    start: () => rec.start(),
    stop: async () => transcribe(await rec.stop()),
  };
}

/** Whether the phone should load whisper at app open (set from the spike page). */
export function voicePreferred(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === 'whisper';
  } catch {
    return false;
  }
}

export function setVoicePreferred(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, 'whisper');
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}
