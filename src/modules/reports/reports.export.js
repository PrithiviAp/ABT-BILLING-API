import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

export async function streamExport(res, rows, format, filenamePrefix, title) {
  if (format === 'csv') {
    const csv = new Parser().parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment(`${filenamePrefix}-${Date.now()}.csv`);
    return res.send(csv);
  }

  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(title || 'Report');

    if (title) {
      sheet.addRow([title]);
      sheet.getRow(1).font = { bold: true, size: 14 };
      sheet.addRow([]);
    }
    if (rows.length) {
      sheet.addRow(Object.keys(rows[0])).font = { bold: true };
      rows.forEach(r => sheet.addRow(Object.values(r)));
    }
    sheet.columns.forEach(c => (c.width = 18));

    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.attachment(`${filenamePrefix}-${Date.now()}.xlsx`);
    await wb.xlsx.write(res);
    return res.end();
  }

  return res.status(400).json({ message: 'Invalid export format' });
}