import { parse as csvParse } from 'csv-parse/sync';
import XLSX from 'xlsx';

export function parseBuffer(
  buffer: Buffer,
  filename: string
): Array<Record<string, unknown>> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) throw new Error('No extension');

  if (ext === 'csv') {
    const str = buffer.toString('utf-8');
    const records = csvParse(str, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true, // Permitir filas con diferente número de columnas
    });
    return records as Array<Record<string, unknown>>;
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheet name found in Excel file');
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' not found in workbook`);
    }
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return json as Array<Record<string, unknown>>;
  }

  if (ext === 'json') {
    return JSON.parse(buffer.toString('utf-8')) as Array<
      Record<string, unknown>
    >;
  }

  throw new Error('Formato no soportado');
}
