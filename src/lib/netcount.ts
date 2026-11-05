// Real network-request counter. Counts, since the current incident started:
//  - resource-timing entries (scripts, images, CSS, etc.) from PerformanceObserver
//  - every fetch() and XMLHttpRequest call, via wrappers
// Fetch/XHR also produce resource entries, so those initiator types are skipped
// in the observer to avoid double counting. data: and blob: URLs are not network.
import { useSyncExternalStore } from 'react';

let since = performance.now();
let count = 0;
const urls: string[] = [];
const listeners = new Set<() => void>();
let installed = false;

function bump(url: string) {
  if (/^(data|blob):/.test(url)) return;
  count++;
  urls.push(url);
  if (urls.length > 50) urls.shift();
  listeners.forEach((l) => l());
}

export function installNetworkCounter() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    bump(url);
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    bump(String(args[1]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origOpen as any).apply(this, args);
  } as typeof XMLHttpRequest.prototype.open;

  if ('PerformanceObserver' in window) {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceResourceTiming[]) {
        if (e.startTime < since) continue;
        if (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest') continue;
        bump(e.name);
      }
    });
    try {
      po.observe({ type: 'resource', buffered: true });
    } catch {
      po.observe({ entryTypes: ['resource'] });
    }
  }
}

/** Reset the counter at the start of an incident. */
export function resetNetworkCounter() {
  since = performance.now();
  count = 0;
  urls.length = 0;
  listeners.forEach((l) => l());
}

export function networkRequestUrls(): readonly string[] {
  return urls;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNetworkCount(): number {
  return useSyncExternalStore(subscribe, () => count);
}
