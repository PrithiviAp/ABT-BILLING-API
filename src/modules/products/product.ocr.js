// import sharp from 'sharp';
// import Tesseract from 'tesseract.js';

// export const extractProductsFromImage = async (buffer) => {

//   const processed = await sharp(buffer)
//     .grayscale()
//     .normalize()
//     .sharpen()
//     .threshold(150)
//     .resize({ width: 1800 })
//     .toBuffer();

//   const result = await Tesseract.recognize(
//     processed,
//     'eng',
//     {
//       tessedit_pageseg_mode: 6,
//     }
//   );

//   console.log(result.data.text);

//   return parseTableText(result.data.text);
// };

// const parseTableText = (text) => {

//   const lines = text
//     .split('\n')
//     .map(l => l.trim())
//     .filter(Boolean);

//   const rows = [];

//   for (const line of lines) {

//     const hsnMatch = line.match(/\b\d{8}\b/);

//     if (!hsnMatch) continue;

//     const hsnCode = hsnMatch[0];

//     const beforeHSN =
//       line.substring(0, line.indexOf(hsnCode)).trim();

//     const afterHSN =
//       line.substring(line.indexOf(hsnCode) + 8).trim();

//     const cols = afterHSN.split(/\s+/);

//     if (cols.length < 5) continue;

//     rows.push({
//       name: beforeHSN,
//       hsnCode,
//       qty: Number(cols[0]),
//       unit: cols[1],
//       rate: Number(cols[3]),
//       gstPercent: 18,
//       stock: Number(cols[0]),
//     });
//   }

//   return rows;
// };
import Tesseract from 'tesseract.js';

export const extractProductsFromImage = async (
  imageBuffer
) => {

  const {
    data: { text }
  } = await Tesseract.recognize(
    imageBuffer,
    'eng'
  );

  return parseTableText(text);
};

const parseTableText = (text) => {

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {

    // Find HSN code
    const hsnMatch = line.match(/\b\d{8}\b/);

    if (!hsnMatch) continue;

    const hsnCode = hsnMatch[0];

    // Text before HSN = product name
    const beforeHSN =
      line.substring(0, line.indexOf(hsnCode)).trim();

    // Remove serial number
    const name = beforeHSN.replace(/^\d+\s*/, '');

    // Text after HSN
    const afterHSN =
      line.substring(
        line.indexOf(hsnCode) + hsnCode.length
      ).trim();

    const cols = afterHSN.split(/\s+/);

    /**
     * Example:
     * 25 PCS 20.00 47.15 264.25
     */

    if (cols.length < 4) continue;

    const qty = Number(cols[0]);

    const unit = cols[1]?.toUpperCase() || 'PCS';

    const rate =
      Number(cols[2]) || 0;

    rows.push({
      name,
      hsnCode,
      unit,
      rate,
      gstPercent: 18,
      stock: qty,
    });
  }

  return rows;
};