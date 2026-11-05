import { useCallback, useState } from 'react';
import type { PinEvent } from '../core/events';

function load(key: string): PinEvent[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PinEvent[]) : [];
  } catch {
    return [];
  }
}

function save(key: string, ev: PinEvent[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ev));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

/** Append-only event log, kept on this device so a page reload loses nothing. */
export function useIncident(key = 'pinpoint.phone.events') {
  const [events, setEvents] = useState<PinEvent[]>(() => load(key));
  const append = useCallback(
    (more: PinEvent[]) => {
      if (!more.length) return;
      setEvents((prev) => {
        const next = [...prev, ...more];
        save(key, next);
        return next;
      });
    },
    [key],
  );
  const reset = useCallback(() => {
    save(key, []);
    setEvents([]);
  }, [key]);
  return { events, append, reset };
}
