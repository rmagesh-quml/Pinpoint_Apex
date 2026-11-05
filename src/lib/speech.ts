// Speech engine seam. The showcase ships tap + quick-phrase buttons by default.
// A live push-to-talk engine is only offered when one has been loaded and
// proven to run on this device (see the speech spike).
export type SpeechEngine = {
  name: string;
  /** Start capturing audio (push-to-talk pressed). */
  start(): Promise<void>;
  /** Stop capturing and return the transcript (push-to-talk released). */
  stop(): Promise<string>;
};

let engine: SpeechEngine | null = null;
const listeners = new Set<() => void>();

export function setSpeechEngine(e: SpeechEngine | null) {
  engine = e;
  listeners.forEach((l) => l());
}

export function getSpeechEngine(): SpeechEngine | null {
  return engine;
}

export function subscribeSpeechEngine(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
