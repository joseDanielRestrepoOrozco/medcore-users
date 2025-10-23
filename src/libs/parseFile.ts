import { parse as csvParse } from 'csv-parse/sync';
import XLSX from 'xlsx';

export function parseBuffer(
  buffer: Buffer,
  filename: string
): Array<Record<string, unknown>> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) throw new Error('No extension');

  if (ext === 'csv') {
    const decode = (buf: Buffer): string => {
      // UTF-16 LE BOM
      if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le');
      // UTF-16 BE BOM -> swap then decode as LE (best effort)
      if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        const swapped = Buffer.alloc(buf.length - 2);
        for (let i = 2; i + 1 < buf.length; i += 2) {
          swapped[i - 2] = buf[i + 1];
          swapped[i - 1] = buf[i];
        }
        return swapped.toString('utf16le');
      }
      const utf8 = buf.toString('utf8');
      // Heurística: si contiene NUL, decodificar como utf16le (evita regex con control char)
      if (utf8.indexOf('\u0000') !== -1) return buf.toString('utf16le');
      return utf8;
    };

    const decoded = decode(buffer);
    const str = decoded.replace(/^\uFEFF/, '');
    const tryParse = (s: string, delimiter: string) => csvParse(s, {
      columns: (header) => header.map((h: string) => String(h).trim()),
      skip_empty_lines: true,
      delimiter,
      trim: true,
      relax_column_count: true,
    }) as Array<Record<string, unknown>>;

    const firstLine = str.split(/\r?\n/)[0] || '';
    const count = (c: string) => (firstLine.match(new RegExp(`\${c}`, 'g')) || []).length;
    const candidates = [
      count(';') >= count(',') && count(';') >= count('\t') ? ';' : (count('\t') > count(',') ? '\t' : ','),
      ',', ';', '\t'
    ];

    for (const d of candidates) {
      try {
        const rec = tryParse(str, d);
        // If parsed and the first row has more than one key, accept
        if (rec.length && Object.keys(rec[0] || {}).length > 1) return rec;
        // If header key contains commas, parsing failed -> try next
        const keys = Object.keys(rec[0] || {});
        if (keys.length === 1 && /,|;|\t/.test(keys[0] || '')) continue;
        return rec;
      } catch {
        // try next delimiter
      }
    }

    // Fallback: naive split by comma
    const rec = tryParse(str, ',');
    return rec;
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
    // Trim headers for XLSX too
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>;
    return json.map((row) => {
      const out: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => { out[String(k).trim()] = v; });
      return out;
    });
  }

  if (ext === 'json') {
    return JSON.parse(buffer.toString('utf-8')) as Array<
      Record<string, unknown>
    >;
  }

  throw new Error('Formato no soportado');
}
