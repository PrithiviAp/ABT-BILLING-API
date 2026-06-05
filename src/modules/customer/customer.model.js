import mongoose from 'mongoose';

// customer.model.js
const customerSchema = new mongoose.Schema({
  name:           { type: String, trim: true },    // ← no required: true
  phone:          { type: String, trim: true },    // ← no required: true
  totalSpent:     { type: Number, default: 0 },
  totalBills:     { type: Number, default: 0 },
  lastPurchaseAt: { type: Date },
}, { timestamps: true });

export const Customer = mongoose.model(
  'Customer',
  customerSchema
);