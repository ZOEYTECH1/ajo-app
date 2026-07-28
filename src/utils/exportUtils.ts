import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

/**
 * Write rows as a UTF-8 CSV to the cache dir then open the system share sheet.
 * All cells are quoted and internal quotes are escaped.
 */
export async function exportCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): Promise<void> {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(c => escape(String(c ?? ''))).join(',')),
  ];
  const uri = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(uri, lines.join('\n'), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
}

/**
 * Render an HTML string to a PDF then open the system share sheet.
 */
export async function exportPdf(dialogTitle: string, html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}
