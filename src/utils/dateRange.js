function getDateRange(period, from, to) {
  const now = new Date();
  let start;

  if (period === 'custom' && from && to) {
    start = new Date(from); start.setHours(0, 0, 0, 0);
    const end = new Date(to); end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  start = new Date();
  if (period === 'monthly') start.setMonth(start.getMonth() - 1);
  else start.setDate(start.getDate() - 7); // weekly default
  start.setHours(0, 0, 0, 0);

  return { start, end: now };
}

module.exports = { getDateRange };