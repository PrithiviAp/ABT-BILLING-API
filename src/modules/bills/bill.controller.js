import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';
import * as billService from './bill.service.js';

export const create = asyncHandler(async (req, res) => {
  const bill = await billService.createBill(req.body);
//   const bill = await billService.createBill(req.body, req.user._id);
  sendCreated(res, bill, 'Bill created');
});

export const getAll = asyncHandler(async (req, res) => {
  const { data, pagination } = await billService.getAllBills(req.query);
  sendPaginated(res, data, pagination);
});

export const getOne = asyncHandler(async (req, res) => {
  const bill = await billService.getBillById(req.params.id);
  sendSuccess(res, bill);
});

export const cancel = asyncHandler(async (req, res) => {
  const bill = await billService.cancelBill(req.params.id);
  sendSuccess(res, bill, 'Bill cancelled');
});

export const payBill = asyncHandler(async (req, res) => {

  const bill = await billService.payBill(
    req.params.id,
    req.body.amount
  );

  sendSuccess(res, bill, 'Payment updated');
});
export const markBillPaid = async (id, amount) => {

  const bill = await Bill.findById(id);

  if (!bill) {
    throw new AppError('Bill not found', 404);
  }

  if (bill.status === 'cancelled') {
    throw new AppError('Cancelled bill cannot be paid', 400);
  }

  const newPaidAmount =
    +(bill.paidAmount + amount).toFixed(2);

  if (newPaidAmount > bill.grandTotal) {
    throw new AppError(
      'Payment exceeds due amount',
      400
    );
  }

  const dueAmount =
    +(bill.grandTotal - newPaidAmount).toFixed(2);

  let status = 'partial';

  if (newPaidAmount <= 0) {
    status = 'unpaid';
  }
  else if (dueAmount <= 0) {
    status = 'paid';
  }

  bill.paidAmount = newPaidAmount;

  bill.dueAmount = dueAmount;

  bill.status = status;

  await bill.save();

  return bill;
};