import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (buffer) => {
  const result = await Tesseract.recognize(
    buffer,
    'eng',
    {
      logger: m => console.log(m)
    }
  );

  return result.data.text;
};