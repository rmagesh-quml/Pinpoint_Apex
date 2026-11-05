import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Renders the payload as an inline SVG QR code. No network involved. */
export function QrCode({ payload, className }: { payload: string; className?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(''));
    return () => {
      live = false;
    };
  }, [payload]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
