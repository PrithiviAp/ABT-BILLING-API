import Bill from '../bills/bill.model.js';
import Product from '../products/product.model.js';

export const getDashboardStats = async () => {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayStats,
    monthStats,
    totalBills,
    totalProducts,
    recentBills,
    topProducts,
  ] = await Promise.all([

    // Today's revenue + bill count
    Bill.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]),

    // This month's revenue
    Bill.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]),

    Bill.countDocuments({ status: { $ne: 'cancelled' } }),
    Product.countDocuments({ isActive: true }),

    // Last 5 bills
    Bill.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('billNo customerName grandTotal createdAt status'),

    // Top 5 selling products this month
    Bill.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'paid' } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          name:     { $first: '$items.productName' },
          totalQty: { $sum: '$items.qty' },
          revenue:  { $sum: '$items.total' }
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]),

  ]);

  return {
    today: {
      revenue: todayStats[0]?.revenue || 0,
      bills:   todayStats[0]?.count   || 0,
    },
    month: {
      revenue: monthStats[0]?.revenue || 0,
      bills:   monthStats[0]?.count   || 0,
    },
    totals: { bills: totalBills, products: totalProducts },
    recentBills,
    topProducts,
  };
};