import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { AppError, badRequest } from './errors';

const MAX_BYTES = 20 * 1024 * 1024;
let activeInspections = 0;
const invalid = () => badRequest('PDF خراب، ناقص، رمزگذاری‌شده یا بیش از حد پیچیده است؛ حداکثر ۲۰۰۰ صفحه مجاز است');

export async function validatePdfContent(buffer: Buffer, timeoutMs = 5000): Promise<void> {
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw invalid();
  // Do not let a tolerant parser silently repair a truncated final revision.
  const tail = buffer.subarray(-4096).toString('latin1');
  const trailer = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  const offset = trailer ? Number(trailer[1]) : -1;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= buffer.length ||
      !/^(xref\b|\d+\s+\d+\s+obj\b)/.test(buffer.subarray(offset, offset + 80).toString('latin1'))) {
    throw invalid();
  }
  if (activeInspections >= 2) throw new AppError(503, 'پردازش PDF موقتاً شلوغ است؛ دوباره تلاش کنید');
  activeInspections++;
  let worker: Worker | undefined;
  let timer: NodeJS.Timeout | undefined;
  try {
    const sourceMode = path.extname(__filename) === '.ts';
    worker = new Worker(path.join(__dirname, `pdfInspection.worker.${sourceMode ? 'ts' : 'js'}`), {
      workerData: buffer,
      execArgv: sourceMode ? ['--require', require.resolve('ts-node/register/transpile-only')] : [],
      ...(sourceMode ? { env: { ...process.env, TS_NODE_PROJECT: path.resolve(__dirname, '../../tsconfig.json') } } : {}),
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
    });
    const inspector = worker;
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => reject(invalid()), timeoutMs);
      inspector.once('message', (result: { valid?: boolean }) => result?.valid === true ? resolve() : reject(invalid()));
      inspector.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ERR_WORKER_OUT_OF_MEMORY') reject(invalid());
        else reject(new AppError(503, 'سرویس بررسی PDF موقتاً در دسترس نیست'));
      });
      inspector.once('exit', () => reject(invalid()));
    });
  } finally {
    clearTimeout(timer);
    try {
      if (worker) await worker.terminate();
    } finally {
      activeInspections--;
    }
  }
}
