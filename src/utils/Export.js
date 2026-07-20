import xlsx from 'xlsx';

const escapeCsvValue = (value) => {
  const str = String(value ?? '');

  // Quote any value containing a comma, quote, or newline, per RFC 4180.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

/**
 * columns: [{ key: 'billNo', header: 'Bill No' }, ...]
 * rows:    [{ billNo: 'ABT-0001', ... }, ...]
 */
export const buildCsv = (columns, rows) => {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(',');

  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(row[c.key])).join(','));

  // Leading BOM so Excel opens UTF-8 CSVs (₹ symbol etc.) without mangling them.
  return '\uFEFF' + [header, ...lines].join('\r\n');
};

export const buildXlsxBuffer = (sheetName, columns, rows) => {
  const data = rows.map((row) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.header] = row[c.key];
    });
    return obj;
  });

  const worksheet = xlsx.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  });

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};