import { execFile } from 'node:child_process';
import path from 'node:path';
import { AppError, badRequest } from './errors';

let activeProbes = 0;
const invalid = () => badRequest('ویدیو خراب، ناقص یا فاقد جریان تصویری قابل‌خواندن است');

// Decode a short sample in an external process. Never load the 500 MB upload
// into Node's RAM, invoke a shell, or permit network input protocols.
export async function validateVideoContent(
  filePath: string,
  options: { binary?: string; timeoutMs?: number } = {}
): Promise<void> {
  if (activeProbes >= 2) throw new AppError(503, 'بررسی ویدیو موقتاً شلوغ است؛ دوباره تلاش کنید');
  activeProbes++;
  try {
    const result = await new Promise<string>((resolve, reject) => {
      execFile(options.binary ?? 'ffprobe', [
        '-v', 'error', '-threads', '1', '-max_alloc', '67108864',
        '-protocol_whitelist', 'file',
        '-format_whitelist', 'mov,matroska,webm,ogg',
        '-probesize', '5242880', '-analyzeduration', '5000000',
        '-select_streams', 'V:0', '-read_intervals', '%+2', '-count_frames',
        '-show_entries', 'stream=codec_type,codec_name,width,height,nb_read_frames',
        '-of', 'json', '-i', path.resolve(filePath),
      ], { timeout: options.timeoutMs ?? 10000, killSignal: 'SIGKILL', maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new AppError(503, 'ابزار بررسی ویدیو روی سرور نصب نشده است'));
        } else if (err || stderr.trim()) reject(invalid());
        else resolve(stdout);
      });
    });
    let streams: { codec_type?: string; codec_name?: string; width?: number; height?: number; nb_read_frames?: string }[];
    try { streams = JSON.parse(result).streams; } catch { throw invalid(); }
    const stream = streams?.[0];
    if (!stream || stream.codec_type !== 'video' || !stream.codec_name || stream.codec_name === 'unknown' ||
        !Number.isSafeInteger(stream.width) || !Number.isSafeInteger(stream.height) ||
        (stream.width ?? 0) <= 0 || (stream.height ?? 0) <= 0 ||
        (stream.width ?? 0) * (stream.height ?? 0) > 64_000_000 ||
        !(Number(stream.nb_read_frames) > 0)) throw invalid();
  } finally {
    activeProbes--;
  }
}
