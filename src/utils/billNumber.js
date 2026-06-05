import Bill from '../modules/bills/bill.model.js';

export const generateBillNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `ABT-${year}`;

  const last = await Bill.findOne(
    { billNo: new RegExp(`^${prefix}`) },
    { billNo: 1 },
    { sort: { createdAt: -1 } }
  );

  let next = 1;
  if (last) {
    const parts = last.billNo.split('-');
    next = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${String(next).padStart(4, '0')}`;
};