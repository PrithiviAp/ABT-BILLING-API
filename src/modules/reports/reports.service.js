import Bill from '../bills/bill.model.js';
import Product from '../products/product.model.js';
import { getDateRange } from './reports.utils.js';

export async function getSalesData(period, from, to, page = 1, limit = 15) {
  const { start, end } = getDateRange(period, from, to);
  const match = { createdAt: { $gte: start, $lte: end } };
  const skip = (page - 1) * limit;

  const [total, bills, summaryAgg] = await Promise.all([
    Bill.countDocuments(match),
    Bill.find(match)
      .populate('customer', 'name phone')   // ← populate the ref
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bill.aggregate([
      { $match: match },
      { $group: { _id: null, totalBills: { $sum: 1 }, totalSales: { $sum: '$grandTotal' } } }
    ])
  ]);

  const rows = bills.map(b => ({
    'Bill No':      b.billNo,                                  // ← was b.billNumber
    'Date':         new Date(b.createdAt).toLocaleDateString('en-IN'),
    'Customer':     b.customer?.name || 'Walk-in',             // ← was b.customerName
    'Items':        b.items?.length || 0,
    'Sub Total':    b.subTotal,
    'Discount':     b.roundOff || 0,                           // ← "Discount" no longer exists either, see note below
    'Grand Total':  b.grandTotal,
    'Status':       b.status,                                  // ← paymentMode doesn't exist; using status instead
  }));

  return {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      totalBills: summaryAgg[0]?.totalBills || 0,
      totalSales: summaryAgg[0]?.totalSales || 0,
      period, start, end
    }
  };
}
export async function getProductsData(page = 1, limit = 15) {
  const filter = { isActive: true };
  const skip = (page - 1) * limit;

  const [total, products, summaryAgg] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Product.aggregate([
      { $match: filter },
      { $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockValue: { $sum: { $multiply: ['$taxableAmount', '$stock'] } }
      } }
    ])
  ]);

  const rows = products.map(p => ({
    'Name':            p.name,
    'Unit':            p.unit,
    'Rate (₹)':        p.rate,
    'GST Applicable':  p.isGstApplicable ? 'Yes' : 'No',
    'GST %':           p.isGstApplicable ? p.gstPercent : '-',
    'Taxable Amount':  p.taxableAmount,
    'Selling Amount':  p.sellingAmountAll,
    'Selling Rate/Pc': p.sellingRate,
    'Stock':           p.stock,
  }));

  return {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      totalProducts:   summaryAgg[0]?.totalProducts || 0,
      totalStockValue: summaryAgg[0]?.totalStockValue || 0,
    }
  };
}

export async function getTopSellingProducts(period, page = 1, limit = 15) {
  const { start, end } = getDateRange(period);
  const skip = (page - 1) * limit;
  const MAX_TOP = 100; // cap the "top selling" universe before paginating

  const [result] = await Bill.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    { $group: {
        _id: '$items.productName',
        totalQty: { $sum: '$items.qty' },
        totalRevenue: { $sum: '$items.total' }
    } },
    { $sort: { totalQty: -1 } },
    { $limit: MAX_TOP },
    { $facet: {
        data:       [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
        summary:    [{ $group: { _id: null, totalQtySold: { $sum: '$totalQty' }, totalRevenue: { $sum: '$totalRevenue' } } }]
    } }
  ]);

  const total = result.totalCount[0]?.count || 0;
  const rows = result.data.map(r => ({
    'Product':     r._id || 'Unknown',
    'Qty Sold':    r.totalQty,
    'Revenue (₹)': r.totalRevenue,
  }));

  return {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      totalQtySold: result.summary[0]?.totalQtySold || 0,
      totalRevenue: result.summary[0]?.totalRevenue || 0,
    }
  };
}

export async function getPaymentModeBreakdown(period, page = 1, limit = 15) {
  const { start, end } = getDateRange(period);
  const skip = (page - 1) * limit;

  const [result] = await Bill.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: {
        _id: '$paymentMode',
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$grandTotal' }
    } },
    { $sort: { totalAmount: -1 } },
    { $facet: {
        data:       [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
        summary:    [{ $group: { _id: null, totalBills: { $sum: '$totalBills' }, totalAmount: { $sum: '$totalAmount' } } }]
    } }
  ]);

  const total = result.totalCount[0]?.count || 0;
  const rows = result.data.map(r => ({
    'Payment Mode': r._id || 'Unspecified',
    'Bills':        r.totalBills,
    'Amount (₹)':   r.totalAmount,
  }));

  return {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      totalBills:  result.summary[0]?.totalBills || 0,
      totalAmount: result.summary[0]?.totalAmount || 0,
    }
  };
}

export async function getLowStockProducts(threshold, page = 1, limit = 15) {
  const filter = { isActive: true, stock: { $lte: threshold } };
  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort({ stock: 1 }).skip(skip).limit(limit).lean()
  ]);

  const rows = products.map(p => ({
    'Name':     p.name,
    'Unit':     p.unit,
    'Stock':    p.stock,
    'Rate (₹)': p.rate,
  }));

  return {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: { totalLowStockItems: total }
  };
}