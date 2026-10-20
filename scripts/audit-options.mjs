import { normalizeUrl } from '../src/report.ts';
export function parseArguments(args) {
  if (!args[0] || args[0].startsWith('-'))
    throw new Error('Usage: npm run audit -- https://your-website.com [--device=desktop]');
  const deviceFlag = args[1] ?? '--device=mobile';
  if (!['--device=mobile', '--device=desktop'].includes(deviceFlag) || args.length > 2)
    throw new Error('Device must be mobile or desktop.');
  return { url: normalizeUrl(args[0]), device: deviceFlag.split('=')[1] };
}
