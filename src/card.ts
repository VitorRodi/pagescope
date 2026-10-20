import { formatBytes, formatTime, type Report, type ResourceGroup } from './report';
export const colors: Record<ResourceGroup, string> = {
  Images: '#f5f5f5',
  JavaScript: '#bdbdc4',
  CSS: '#92929c',
  Fonts: '#6a6a74',
  HTML: '#4a4a53',
  Other: '#323238',
};
export async function exportCard(report: Report, source: string, illustrative: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot create an image.');
  await Promise.all([document.fonts.load('400 20px Inter'), document.fonts.load('600 48px Inter')]);
  const logo = new Image();
  logo.src = `${import.meta.env.BASE_URL}brand/rivo-wordmark-dark.png`;
  await logo.decode();
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(64, 106, 1072, 1);
  ctx.drawImage(logo, 50, 27, 150, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 25px Inter, sans-serif';
  ctx.fillText('PageScope / website X-ray', 226, 64);
  ctx.font = '600 48px Inter, sans-serif';
  ctx.fillText(new URL(report.url).hostname.slice(0, 38), 64, 154);
  ctx.fillStyle = '#c0c0c6';
  ctx.font = '400 18px Inter, sans-serif';
  ctx.fillText(`${source} · ${report.device} · Lighthouse ${report.version}`, 64, 198);
  const metrics = [
    ['Transferred', formatBytes(report.totalBytes)],
    ['Largest contentful paint', formatTime(report.metrics.lcp)],
    ['Performance score', report.score === null ? 'Unavailable' : `${report.score}/100`],
  ];
  metrics.forEach(([label, value], i) => {
    const x = 64 + i * 370;
    ctx.fillStyle = '#c0c0c6';
    ctx.font = '400 18px Inter, sans-serif';
    ctx.fillText(label, x, 286);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 42px Inter, sans-serif';
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
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText(
        `${entry.name} · ${formatBytes(entry.bytes)}`,
        86 + (i % 3) * 370,
        494 + Math.floor(i / 3) * 36,
      );
    });
  ctx.fillStyle = '#c0c0c6';
  ctx.font = '400 17px Inter, sans-serif';
  ctx.fillText(
    illustrative
      ? 'ILLUSTRATIVE EXAMPLE · synthetic data, not a website measurement'
      : `Single lab run · ${report.date || 'date unavailable'} · results vary between runs`,
    64,
    604,
  );
  ctx.font = '400 16px Inter, sans-serif';
  ctx.fillText('github.com/VitorRodi/rivo-pagescope', 64, 642);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
      'image/png',
    ),
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = illustrative ? 'rivo-pagescope-example.png' : 'rivo-pagescope-report.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
