import { formatBytes, formatTime, type Report, type ResourceGroup } from './report';
export const colors: Record<ResourceGroup, string> = {
  Images: '#188b89',
  JavaScript: '#2459de',
  CSS: '#835dc5',
  Fonts: '#b87916',
  HTML: '#64748b',
  Other: '#8c99ac',
};
export async function exportCard(report: Report, source: string, illustrative: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot create an image.');
  ctx.fillStyle = '#f3f6fa';
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = '#2459de';
  ctx.fillRect(0, 0, 16, 675);
  ctx.fillStyle = '#182739';
  ctx.font = 'bold 28px Segoe UI, sans-serif';
  ctx.fillText('PageScope / website X-ray', 64, 75);
  ctx.font = 'bold 48px Trebuchet MS, sans-serif';
  ctx.fillText(new URL(report.url).hostname.slice(0, 38), 64, 154);
  ctx.font = '20px Segoe UI, sans-serif';
  ctx.fillText(`${source} · ${report.device} · Lighthouse ${report.version}`, 64, 198);
  const metrics = [
    ['Transferred', formatBytes(report.totalBytes)],
    ['Largest contentful paint', formatTime(report.metrics.lcp)],
    ['Performance score', report.score === null ? 'Unavailable' : `${report.score}/100`],
  ];
  metrics.forEach(([label, value], i) => {
    const x = 64 + i * 370;
    ctx.fillStyle = '#526278';
    ctx.font = '19px Segoe UI, sans-serif';
    ctx.fillText(label, x, 286);
    ctx.fillStyle = '#182739';
    ctx.font = 'bold 42px Trebuchet MS, sans-serif';
    ctx.fillText(value, x, 342);
  });
  let offset = 64;
  const groupTotal = report.groups.reduce((sum, g) => sum + g.bytes, 0);
  for (const entry of report.groups) {
    const width = groupTotal ? (entry.bytes / groupTotal) * 1072 : 0;
    ctx.fillStyle = colors[entry.name];
    ctx.fillRect(offset, 402, width, 54);
    offset += width;
  }
  report.groups
    .filter((g) => g.bytes)
    .forEach((entry, i) => {
      ctx.fillStyle = colors[entry.name];
      ctx.fillRect(64 + (i % 3) * 370, 482 + Math.floor(i / 3) * 36, 12, 12);
      ctx.fillStyle = '#182739';
      ctx.font = '18px Segoe UI, sans-serif';
      ctx.fillText(
        `${entry.name} · ${formatBytes(entry.bytes)}`,
        86 + (i % 3) * 370,
        494 + Math.floor(i / 3) * 36,
      );
    });
  ctx.fillStyle = '#526278';
  ctx.font = '18px Segoe UI, sans-serif';
  ctx.fillText(
    illustrative
      ? 'ILLUSTRATIVE EXAMPLE · synthetic data, not a website measurement'
      : `Single lab run · ${report.date || 'date unavailable'} · results vary between runs`,
    64,
    604,
  );
  ctx.font = '16px Segoe UI, sans-serif';
  ctx.fillText('github.com/VitorRodi/pagescope', 64, 642);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
      'image/png',
    ),
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = illustrative ? 'pagescope-example.png' : 'pagescope-report.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
