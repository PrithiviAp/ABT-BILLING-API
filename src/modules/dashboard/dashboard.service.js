import Bill from '../bills/bill.model.js';
import Product from '../products/product.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// NOTE: aggregation below groups by day using Asia/Kolkata so "today" and the
// weekly chart line up with IST business hours, regardless of the server's
// own system timezone (which is often UTC on hosted environments).
const BUSINESS_TZ = 'Asia/Kolkata';

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Local YYYY-MM-DD key (NOT toISOString, which would shift to UTC and can
// land on the wrong day for IST).
const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildLastNDays = (n, today) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    days.push({ key: toDateKey(d), label: WEEKDAY_LABELS[d.getDay()] });
  }
  return days;
};

export const getDashboardStats = async () => {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(today.getTime() - 6 * DAY_MS); // last 7 days incl. today

 const [
  todayStats,
  weeklyDailyAgg,
  monthStats,
  totalBills,
  totalProducts,
  inStockCount,
  outOfStockCount,
  lowStockCount,
  lowStockProducts,
  recentBills,
  topProducts,
] = await Promise.all([

    // Today's revenue + bill count
    Bill.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]),

    // Daily revenue for the last 7 days (chart data)
    Bill.aggregate([
      { $match: { createdAt: { $gte: weekStart }, status: 'paid' } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: BUSINESS_TZ } },
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 },
      }},
    ]),

    // This month's revenue
    Bill.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]),

    Bill.countDocuments({ status: { $ne: 'cancelled' } }),

    // Product counts — scoped to isActive:true, matching how the product
    // list/soft-delete already works (deleted products flip isActive false).
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: { $gt: 0 } }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),

      Product.countDocuments({
    isActive: true,
    openingStock: { $gt: 0 },
    stock: { $gt: 0 },   // out-of-stock already covered by its own card
    $expr: { $lte: ['$stock', { $multiply: ['$openingStock', 0.2] }] },
  }),
  Product.aggregate([
    { $match: { isActive: true, openingStock: { $gt: 0 }, stock: { $gt: 0 } } },
    { $addFields: {
        soldPercent: {
          $multiply: [
            { $divide: [ { $subtract: ['$openingStock', '$stock'] }, '$openingStock' ] },
            100,
          ],
        },
    } },
    { $match: { soldPercent: { $gte: 80 } } },
    { $sort: { soldPercent: -1 } },
    { $limit: 5 },
    { $project: { name: 1, stock: 1, openingStock: 1, soldPercent: { $round: ['$soldPercent', 1] } } },
  ]),

    // Last 5 bills — FIX: schema field is `customer` (ObjectId ref), not
    // `customerName`, so the old select() was pulling a field that doesn't
    // exist and customer info never actually reached the dashboard.
    Bill.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('billNo customer grandTotal createdAt status')
      .populate('customer', 'name phone'),

    // Top 5 selling products this month
    Bill.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'paid' } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          name:     { $first: '$items.productName' },
          totalQty: { $sum: '$items.qty' },
          revenue:  { $sum: '$items.total' },
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]),

  ]);

  // Fill in every day of the last 7 days — including days with zero sales —
  // so the weekly chart always renders a full, evenly-spaced week.
  const dailyByKey = new Map(weeklyDailyAgg.map((d) => [d._id, d]));

  const daily = buildLastNDays(7, today).map(({ key, label }) => ({
    date: key,
    label,
    revenue: dailyByKey.get(key)?.revenue || 0,
    bills: dailyByKey.get(key)?.count || 0,
  }));

  const weekRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
  const weekBills = daily.reduce((sum, d) => sum + d.bills, 0);

return {
  today:  { revenue: todayStats[0]?.revenue || 0, bills: todayStats[0]?.count || 0 },
  week:   { revenue: weekRevenue, bills: weekBills, daily },
  month:  { revenue: monthStats[0]?.revenue || 0, bills: monthStats[0]?.count || 0 },
  totals: {
    bills:      totalBills,
    products:   totalProducts,
    inStock:    inStockCount,
    outOfStock: outOfStockCount,
    lowStock:   lowStockCount,   // ← new
  },
  lowStockProducts,               // ← new
  recentBills,
  topProducts,
};
};