import { useEffect, useRef } from 'react';

const BASE_TITLE = 'Task Dashboard';

export default function useFaviconBadge(count) {
  const originalHref = useRef(null);

  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;

    // Remember the original favicon on first run
    if (!originalHref.current) {
      originalHref.current = link.href;
    }

    if (count > 0) {
      document.title = `(${count}) ${BASE_TITLE}`;

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');

      // Dark background circle
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();

      // "T" letter in accent color
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('T', 16, 17);

      // Red badge circle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(26, 7, 7, 0, Math.PI * 2);
      ctx.fill();

      // Badge count text
      const label = count > 99 ? '99+' : String(count);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${label.length > 1 ? '7' : '9'}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 26, 7);

      link.href = canvas.toDataURL('image/png');
    } else {
      document.title = BASE_TITLE;
      link.href = originalHref.current || '/favicon.ico';
    }
  }, [count]);
}
