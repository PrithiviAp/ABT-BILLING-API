import mongoose from 'mongoose';


const billItemSchema = new mongoose.Schema({
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:   { type: String, required: true },
  hsnCode:       { type: String, required: true },
  unit:          { type: String, required: true },
  rate:          { type: Number, required: true },
  qty:           { type: Number, required: true, min: 1 },
  gstPercent:    { type: Number, required: true },
  taxableAmount: { type: Number, required: true },
  gstAmount:     { type: Number, required: true },
  total:         { type: Number, required: true },
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNo:        { type: String, required: true, unique: true },

customer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Customer',
},

  items: {
    type: [billItemSchema],
    required: true,
  },

  subTotal: {
    type: Number,
    required: true,
  },

  totalGst: {
    type: Number,
    required: true,
  },

  grandTotal: {
    type: Number,
    required: true,
  },

  paidAmount: {
    type: Number,
    default: 0,
  },

  dueAmount: {
    type: Number,
    default: 0,
  },

  status: {
    type: String,
    enum: ['paid', 'unpaid', 'partial', 'cancelled'],
    default: 'unpaid',
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dueAmount: {
  type: Number,
  default: 0,
},

  notes: {
    type: String,
    default: '',
  },

}, { timestamps: true });

billSchema.index({ billNo: 1 });
billSchema.index({ customerName: 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ status: 1 });

export default mongoose.model('Bill', billSchema);