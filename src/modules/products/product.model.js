import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  unit:             { type: String, required: true, enum: ['Nos','Kg','Mtr','Box','Pcs','Roll','Ltr','Set'] },
  rate:             { type: Number, required: true, min: 0 },
  discPercent:      { type: Number, default: 0, min: 0, max: 100 },
  totalAmount:      { type: Number, default: 0 },     // auto-calculated
  isGstApplicable:  { type: Boolean, default: true },
  gstPercent:       { type: Number, default: 0, enum: [0, 5, 12, 18, 28] },
  taxableAmount:    { type: Number, default: 0 },     // auto-calculated
  sellingAmountAll: { type: Number, required: true, min: 0 },  // user-entered (manual) or from sheet (bulk)
  sellingRate:      { type: Number, default: 0 },     // auto-calculated
  stock:            { type: Number, default: 0, min: 0 },
  isActive:         { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ isActive: 1 });
productSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);