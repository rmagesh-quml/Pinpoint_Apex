// Webcam QR scanning with the bundled jsQR decoder. No network involved.
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

export type CamState = 'starting' | 'live' | 'denied' | 'none';

export function useQrScanner(onCode: (data: string) => void, intervalMs = 150) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cam, setCam] = useState<CamState>('starting');
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam('none');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      } catch (e) {
        setCam(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'none');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setCam('live');
      let tick = 0;
      timer = setInterval(() => {
        if (v.readyState < 2 || !v.videoWidth) return;
        // Always native resolution (downscaling blurs a phone-screen QR past
        // what jsQR can read). Alternate a centre crop, where the prompt frame
        // is, with the whole frame.
        const vw = v.videoWidth;
        const vh = v.videoHeight;
        const crop = tick++ % 2 === 0;
        const sw = crop ? Math.round(vw * 0.6) : vw;
        const sh = crop ? Math.round(vh * 0.8) : vh;
        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) cb.current(code.data);
      }, intervalMs);
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [intervalMs]);

  return { videoRef, cam };
}
