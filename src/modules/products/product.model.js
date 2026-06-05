import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  hsnCode:    { type: String, required: true, trim: true },
  unit:       { type: String, required: true, enum: ['Nos', 'Kg', 'Mtr', 'Box', 'Pcs', 'Roll', 'Ltr', 'Set'] },
  rate:       { type: Number, required: true, min: 0 },
  gstPercent: { type: Number, required: true, enum: [0, 5, 12, 18, 28] },
  stock:      { type: Number, default: 0, min: 0 },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ name: 'text', hsnCode: 'text' });
productSchema.index({ isActive: 1 });

export default mongoose.model('Product', productSchema);