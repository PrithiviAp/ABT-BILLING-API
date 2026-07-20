export const computeTaxableAmount = (rate, isGstApplicable, gstPercent) => {
  const r = parseFloat(rate) || 0;
  if (!isGstApplicable) return r;
  const g = parseFloat(gstPercent) || 0;
  return +(r * (1 + g / 100)).toFixed(2);
};
// product.utils.js
export const computeProductAmounts = ({
  rate,
  stock,
  discPercent = 0,
  isGstApplicable,
  gstPercent,
  sellingRate,        // primary input now — per pcs
}) => {
  const r    = parseFloat(rate)  || 0;
  const qty  = parseFloat(stock) || 0;
  const disc = parseFloat(discPercent) || 0;
  const gst  = isGstApplicable ? (parseFloat(gstPercent) || 0) : 0;

  const totalAmount   = +(r * qty * (1 - disc / 100)).toFixed(2);
  const taxableAmount = +(isGstApplicable ? totalAmount * (1 + gst / 100) : totalAmount).toFixed(2);

  const sRate = parseFloat(sellingRate) || 0;
  const sAll  = +(sRate * qty).toFixed(2);

  return {
    discPercent:      disc,
    totalAmount,
    gstPercent:        gst,
    taxableAmount,
    sellingRate:       sRate,
    sellingAmountAll:  sAll,
  };
};