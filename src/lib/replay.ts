// Plays the scripted Pandapas Pond run in real time through the real protocol
// engine, extractor and record builder. Pausable; loops.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PinEvent } from '../core/events';
import { scriptEvents, SCRIPT_LENGTH_S } from '../core/script';
import { resetNetworkCounter } from './netcount';

export type Replay = {
  /** Events that have "happened" so far in this loop. */
  events: PinEvent[];
  /** Virtual wall-clock now (ms), frozen while paused. */
  now: number;
  t0: number;
  paused: boolean;
  loop: number;
  toggle: () => void;
  restart: () => void;
};

export function useScriptReplay(lengthS = SCRIPT_LENGTH_S, tickMs = 200): Replay {
  const [t0, setT0] = useState(() => Date.now());
  const [loop, setLoop] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(t0);
  const pausedAt = useRef<number | null>(null);

  const all = useMemo(() => scriptEvents(t0, 'pp', `demo${loop}`), [t0, loop]);

  useEffect(() => {
    resetNetworkCounter(); // each loop is a new incident
  }, [loop]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const n = Date.now();
      if (n - t0 >= lengthS * 1000) {
        setT0(n);
        setNow(n);
        setLoop((l) => l + 1);
      } else setNow(n);
    }, tickMs);
    return () => clearInterval(id);
  }, [paused, t0, lengthS, tickMs]);

  const toggle = () => {
    if (paused) {
      // Shift t0 forward by the paused duration so the run resumes in place.
      const shift = Date.now() - (pausedAt.current ?? Date.now());
      setT0((t) => t + shift);
      setNow(Date.now());
      pausedAt.current = null;
      setPaused(false);
    } else {
      pausedAt.current = Date.now();
      setPaused(true);
    }
  };
  const restart = () => {
    const n = Date.now();
    pausedAt.current = null;
    setT0(n);
    setNow(n);
    setLoop((l) => l + 1);
    setPaused(false);
  };

  // While paused, `all` was rebuilt with a shifted t0 on resume; filtering on
  // virtual time keeps the visible state identical across the pause.
  const events = useMemo(() => all.filter((e) => e.t <= now), [all, now]);
  return { events, now, t0, paused, loop, toggle, restart };
}
