import { parentPort, workerData } from 'node:worker_threads';
import { PDFDocument, PDFName } from 'pdf-lib';

async function inspect() {
  try {
    const document = await PDFDocument.load(workerData as Uint8Array, {
      ignoreEncryption: false, throwOnInvalidObject: true, updateMetadata: false,
    });
    const pages = document.getPages();
    if (pages.length < 1 || pages.length > 2000) throw new Error('Page limit');
    for (const page of pages) {
      const { width, height } = page.getSize();
      if (page.node.get(PDFName.of('Type'))?.toString() !== '/Page' ||
          !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error('Invalid page');
      }
    }
    parentPort!.postMessage({ valid: true });
  } catch {
    parentPort!.postMessage({ valid: false });
  }
}
void inspect();
