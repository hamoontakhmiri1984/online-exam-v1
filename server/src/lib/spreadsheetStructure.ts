import * as XLSX from 'xlsx';
import { validateXlsxArchive } from './spreadsheetArchive';

export function isStructuredWorkbook(buffer: Buffer, kind: 'xlsx' | 'xls'): boolean {
  try {
    if (buffer.length > 10 * 1024 * 1024) return false;
    if (kind === 'xlsx') {
      validateXlsxArchive(buffer);
    } else {
      // An OLE container can also be a Word document or any arbitrary stream.
      // Require an actual BIFF workbook stream before calling the Excel parser.
      const container = XLSX.CFB.read(buffer, { type: 'buffer' });
      if (!container.FileIndex.some((entry: { type: number; name: string; size: number }) =>
        entry.type === 2 && /^(Workbook|Book)$/.test(entry.name) &&
        entry.size > 0 && entry.size <= buffer.length
      )) return false;
    }
    const workbook = XLSX.read(buffer, { type: 'buffer', bookSheets: true, WTF: true });
    return workbook.SheetNames.length > 0;
  } catch {
    return false;
  }
}
