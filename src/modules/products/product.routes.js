import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAll, getOne, create, update, remove, patchStock, uploadMiddleware, bulkUpload, confirmBulkUpload  } from './product.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

const router = Router();

router.use(protect);  // all product routes require auth

const productRules = [
  body('name').notEmpty().withMessage('Product name required'),
  body('hsnCode').notEmpty().withMessage('HSN code required'),
  body('unit').isIn(['Nos','Kg','Mtr','Box','Pcs','Roll','Ltr','Set']).withMessage('Invalid unit'),
  body('rate').isFloat({ min: 0.01 }).withMessage('Rate must be > 0'),
  body('gstPercent').isIn([0,5,12,18,28]).withMessage('Invalid GST rate'),
];

router.get('/',       getAll);
router.get('/:id',    getOne);
router.post('/',      validate(productRules), create);
router.put('/:id',    validate(productRules), update);
router.delete('/:id', remove);
router.patch('/:id/stock', validate([
  body('qty').isNumeric().withMessage('qty must be a number'),
  body('operation').isIn(['set','increment','decrement']).withMessage('Invalid operation'),
]), patchStock);
router.post('/bulk-upload',  uploadMiddleware, bulkUpload);
router.post('/bulk-confirm', confirmBulkUpload);

export default router;