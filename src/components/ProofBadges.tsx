import { useNetworkCount } from '../lib/netcount';
import { useOnline } from '../lib/online';

/**
 * Offline proof. The badge only claims airplane mode when the device really
 * reports no network (navigator.onLine === false). The counter is measured.
 */
export function ProofBadges({ split = false }: { split?: boolean }) {
  const online = useOnline();
  const count = useNetworkCount();
  const status = online ? 'Online' : 'Airplane mode';
  return (
    <div className="badges">
      {split ? (
        <>
          <span className={`badge ${online ? 'warn' : 'ok'}`}>{status}</span>
          <span className="badge ok">Runs on this device</span>
        </>
      ) : (
        <span className={`badge ${online ? 'warn' : 'ok'}`}>{status} · Running on this device</span>
      )}
      <span className={`badge ${count === 0 ? 'ok' : 'bad'}`}>Network requests: {count}</span>
    </div>
  );
}
