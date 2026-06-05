// import { AppError } from '../../utils/appError.js';
// import { generateBillNumber } from '../../utils/billNumber.js';
// import { Customer } from '../customer/customer.model.js';

// import Bill from './bill.model.js';

// export const createBill = async (data, userId) => {

//   const billNo = await generateBillNumber();

//   let subTotal = 0;
//   let totalGst = 0;
//   let calculatedGrandTotal = 0;

//   const items = data.items.map((item) => {

//     const taxable =
//       +(item.rate * item.qty).toFixed(2);

//     const gstAmt =
//       +(taxable * item.gstPercent / 100).toFixed(2);

//     const total =
//       +(taxable + gstAmt).toFixed(2);

//     subTotal += taxable;
//     totalGst += gstAmt;
//     calculatedGrandTotal += total;

//     return {
//       ...item,

//       taxableAmount: taxable,

//       gstAmount: gstAmt,

//       total,
//     };
//   });

//   // Final totals
//   subTotal = +subTotal.toFixed(2);

//   totalGst = +totalGst.toFixed(2);

//   calculatedGrandTotal =
//     +calculatedGrandTotal.toFixed(2);

//   // Rounded final bill amount
//   const grandTotal =
//     Math.round(calculatedGrandTotal);

//   // Round off difference
//   const roundOff =
//     +(grandTotal - calculatedGrandTotal).toFixed(2);

//   // Payment
//   const paidAmount =
//     +parseFloat(data.paidAmount || 0).toFixed(2);

//   if (paidAmount < 0) {
//     throw new AppError(
//       'Paid amount cannot be negative',
//       400
//     );
//   }

//   if (paidAmount > grandTotal) {
//     throw new AppError(
//       'Paid amount cannot exceed grand total',
//       400
//     );
//   }

//   const dueAmount =
//     +(grandTotal - paidAmount).toFixed(2);

//   // Status
//   let status = 'partial';

//   if (paidAmount <= 0) {
//     status = 'unpaid';
//   }
//   else if (dueAmount <= 0) {
//     status = 'paid';
//   }


// let customer = await Customer.findOne({
//   phone: data.customerPhone,
// });

// if (!customer) {

//   customer = await Customer.create({

//     name: data.customerName,

//     phone: data.customerPhone,

//     totalSpent: grandTotal,

//     totalBills: 1,

//     lastPurchaseAt: new Date(),
//   });

// }
// else {

//   customer.name = data.customerName;

//   customer.totalSpent += grandTotal;

//   customer.totalBills += 1;

//   customer.lastPurchaseAt = new Date();

//   await customer.save();
// }
// return Bill.create({

//   billNo,

//   customer: customer._id,

//   items,

//   subTotal,

//   totalGst,

//   calculatedGrandTotal,

//   roundOff,

//   grandTotal,

//   paidAmount,

//   dueAmount,

//   status,

//   notes: data.notes || '',
// });
// };

// export const payBill = async (billId, amount) => {

//   const bill = await Bill.findById(billId);

//   if (!bill) {
//     throw new AppError('Bill not found', 404);
//   }

//   if (bill.status === 'cancelled') {
//     throw new AppError(
//       'Cancelled bill cannot be updated',
//       400
//     );
//   }

//   amount = +parseFloat(amount).toFixed(2);

//   if (amount <= 0) {
//     throw new AppError(
//       'Invalid payment amount',
//       400
//     );
//   }

//   const updatedPaidAmount =
//     +(bill.paidAmount + amount).toFixed(2);

//   if (updatedPaidAmount > bill.grandTotal) {

//     throw new AppError(
//       'Paid amount cannot exceed grand total',
//       400
//     );
//   }

//   bill.paidAmount = updatedPaidAmount;

//   bill.dueAmount = +(
//     bill.grandTotal - bill.paidAmount
//   ).toFixed(2);

//   if (bill.dueAmount <= 0) {

//     bill.status = 'paid';
//   }
//   else if (bill.paidAmount > 0) {

//     bill.status = 'partial';
//   }
//   else {

//     bill.status = 'unpaid';
//   }

//   await bill.save();

//   return bill;
// };

// export const getAllBills = async ({ page = 1, limit = 20, search, status, from, to }) => {
//   const query = {};

//   if (status) query.status = status;

//   if (search) {
//     query.$or = [
//       { billNo:       { $regex: search, $options: 'i' } },
//       { customerName: { $regex: search, $options: 'i' } },
//     ];
//   }

//   if (from || to) {
//     query.createdAt = {};
//     if (from) query.createdAt.$gte = new Date(from);
//     if (to)   query.createdAt.$lte = new Date(new Date(to).setHours(23,59,59,999));
//   }

//   const skip  = (page - 1) * limit;
//   const total = await Bill.countDocuments(query);
//   const data  = await Bill.find(query)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(+limit)
//     .select('-items')          // list view — no items for performance
//     .populate('customer', 'name phone')
//     .populate('createdBy', 'name');

//   return { data, pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) } };
// };

// export const getBillById = async (id) => {
//   const bill = await Bill.findById(id).populate('customer', 'name phone')
//   .populate('createdBy', 'name');
//   if (!bill) throw new AppError('Bill not found', 404);
//   return bill;
// };

// export const cancelBill = async (id) => {
//   const bill = await Bill.findByIdAndUpdate(
//     id, { status: 'cancelled' }, { new: true }
//   );
//   if (!bill) throw new AppError('Bill not found', 404);
//   return bill;
// };
import { AppError } from '../../utils/appError.js';
import { generateBillNumber } from '../../utils/billNumber.js';
import { Customer } from '../customer/customer.model.js';
import Product from '../products/product.model.js';
import Bill from './bill.model.js';

export const createBill = async (data, userId) => {

  const billNo = await generateBillNumber();

  // ── 1. Stock validation & deduction ──────────────────────────
  for (const item of data.items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new AppError(`Product "${item.productName}" not found`, 404);
    }

    if (product.stock < item.qty) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.qty}`,
        400
      );
    }

    product.stock -= item.qty;

    if (product.stock === 0) {
      product.isActive = false;
    }

    await product.save();
  }

  // ── 2. Calculate totals (your existing logic) ─────────────────
  let subTotal = 0;
  let totalGst = 0;
  let calculatedGrandTotal = 0;

  const items = data.items.map((item) => {
    const taxable = +(item.rate * item.qty).toFixed(2);
    const gstAmt  = +(taxable * item.gstPercent / 100).toFixed(2);
    const total   = +(taxable + gstAmt).toFixed(2);

    subTotal             += taxable;
    totalGst             += gstAmt;
    calculatedGrandTotal += total;

    return { ...item, taxableAmount: taxable, gstAmount: gstAmt, total };
  });

  subTotal             = +subTotal.toFixed(2);
  totalGst             = +totalGst.toFixed(2);
  calculatedGrandTotal = +calculatedGrandTotal.toFixed(2);

  const grandTotal = Math.round(calculatedGrandTotal);
  const roundOff   = +(grandTotal - calculatedGrandTotal).toFixed(2);

  // ── 3. Payment (your existing logic) ─────────────────────────
  const paidAmount = +parseFloat(data.paidAmount || 0).toFixed(2);

  if (paidAmount < 0) {
    throw new AppError('Paid amount cannot be negative', 400);
  }

  if (paidAmount > grandTotal) {
    throw new AppError('Paid amount cannot exceed grand total', 400);
  }

  const dueAmount = +(grandTotal - paidAmount).toFixed(2);

  let status = 'partial';
  if (paidAmount <= 0)     status = 'unpaid';
  else if (dueAmount <= 0) status = 'paid';

// ── 4. Customer upsert — fully optional ──────────────────────
const customerName  = data.customerName?.trim()  || '';
const customerPhone = data.customerPhone?.trim() || '';

let customer = null;

if (customerName || customerPhone) {

  if (customerPhone) {
    // Try to find by phone first
    customer = await Customer.findOne({ phone: customerPhone });
  }

  if (!customer && customerName && !customerPhone) {
    // No phone — try to find by name only
    customer = await Customer.findOne({ name: customerName });
  }

  if (!customer) {
    // Create new customer with whatever we have
    customer = await Customer.create({
      ...(customerName  && { name:  customerName  }),
      ...(customerPhone && { phone: customerPhone }),
      totalSpent:     grandTotal,
      totalBills:     1,
      lastPurchaseAt: new Date(),
    });
  } else {
    // Update existing
    if (customerName)  customer.name  = customerName;
    customer.totalSpent     += grandTotal;
    customer.totalBills     += 1;
    customer.lastPurchaseAt  = new Date();
    await customer.save();
  }
}

// ── 5. Create bill ────────────────────────────────────────────
return Bill.create({
  billNo,
  ...(customer && { customer: customer._id }),  // ← only attach if exists
  items,
  subTotal,
  totalGst,
  calculatedGrandTotal,
  roundOff,
  grandTotal,
  paidAmount,
  dueAmount,
  status,
  notes: data.notes || '',
});
};

export const cancelBill = async (id) => {
  const bill = await Bill.findById(id);
  if (!bill) throw new AppError('Bill not found', 404);

  if (bill.status === 'cancelled') {
    throw new AppError('Bill is already cancelled', 400);
  }

  // ── Restore stock on cancel ───────────────────────────────────
  for (const item of bill.items) {
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock    += item.qty;
      product.isActive  = true;   // re-activate if it was marked out-of-stock
      await product.save();
    }
  }

  bill.status = 'cancelled';
  await bill.save();
  return bill;
};

// ── Everything below unchanged ────────────────────────────────────

export const payBill = async (billId, amount) => {
  const bill = await Bill.findById(billId);

  if (!bill) throw new AppError('Bill not found', 404);

  if (bill.status === 'cancelled') {
    throw new AppError('Cancelled bill cannot be updated', 400);
  }

  amount = +parseFloat(amount).toFixed(2);

  if (amount <= 0) throw new AppError('Invalid payment amount', 400);

  const updatedPaidAmount = +(bill.paidAmount + amount).toFixed(2);

  if (updatedPaidAmount > bill.grandTotal) {
    throw new AppError('Paid amount cannot exceed grand total', 400);
  }

  bill.paidAmount = updatedPaidAmount;
  bill.dueAmount  = +(bill.grandTotal - bill.paidAmount).toFixed(2);

  if (bill.dueAmount <= 0)      bill.status = 'paid';
  else if (bill.paidAmount > 0) bill.status = 'partial';
  else                          bill.status = 'unpaid';

  await bill.save();
  return bill;
};

export const getAllBills = async ({ page = 1, limit = 20, search, status, from, to }) => {
  const query = {};

  if (status) query.status = status;

  if (search) {
    query.$or = [
      { billNo:       { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const skip  = (page - 1) * limit;
  const total = await Bill.countDocuments(query);
  const data  = await Bill.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(+limit)
    .select('-items')
    .populate('customer', 'name phone')
    .populate('createdBy', 'name');

  return {
    data,
    pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
  };
};

export const getBillById = async (id) => {
  const bill = await Bill.findById(id)
    .populate('customer', 'name phone')
    .populate('createdBy', 'name');
  if (!bill) throw new AppError('Bill not found', 404);
  return bill;
};