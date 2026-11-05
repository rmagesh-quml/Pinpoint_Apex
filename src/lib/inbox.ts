// Handoffs received on this laptop, kept in this browser only. No patient
// names are stored or shown: time, location, size, and the record payload.
import { useCallback, useState } from 'react';

export type InboxItem = { key: string; receivedAt: number; loc: string; bytes: number; payload: string };

const KEY = 'pinpoint.report.inbox';

function load(): InboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as InboxItem[];
  } catch {
    return [];
  }
}

function save(items: InboxItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* in-memory only */
  }
}

export function sameEvening(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>(load);
  /** Adds the item unless the same record was already received. */
  const add = useCallback((item: InboxItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.key === item.key)) return prev;
      const next = [item, ...prev].slice(0, 200);
      save(next);
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    save([]);
    setItems([]);
  }, []);
  return { items, add, clear };
}
