import { useEffect, useState, type ReactNode } from 'react';

/** Fixed 1920x1080 canvas scaled to fit the window, letterboxed. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="stage-wrap">
      <div className={`stage ${className}`} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
