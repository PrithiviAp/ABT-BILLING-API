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
      unit,
      rate,
      gstPercent: 18,
      stock: qty,
    });
  }

  return rows;
};