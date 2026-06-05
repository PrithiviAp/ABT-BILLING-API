import { Router } from 'express';
import { body } from 'express-validator';
import {
  create,
  getAll,
  getOne,
  cancel,
  payBill,
} from './bill.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

const router = Router();
router.use(protect);

const billRules = [
  // customerName — optional, but if provided must be a non-empty string
  body('customerName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customer name cannot be blank if provided'),

  // customerPhone — optional, but if provided must be valid
  body('customerPhone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+91\s?\d{10}$/)
    .withMessage('Phone must be a valid +91 number'),

  // items — always required
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item required'),

  body('items.*.productId')
    .notEmpty()
    .withMessage('Product ID required'),

  body('items.*.qty')
    .isInt({ min: 1 })
    .withMessage('Qty must be >= 1'),

  body('items.*.rate')
    .isFloat({ min: 0 })
    .withMessage('Rate must be >= 0'),

  body('items.*.gstPercent')
    .isIn([0, 5, 12, 18, 28])
    .withMessage('Invalid GST rate'),
];

router.get('/',             getAll);
router.get('/:id',          getOne);
router.post('/',            validate(billRules), create);
router.patch('/:id/cancel', cancel);
router.patch('/:id/pay',    payBill);

export default router;