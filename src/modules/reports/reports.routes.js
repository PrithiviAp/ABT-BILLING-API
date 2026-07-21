import express from 'express';
import {
  getSalesReport,
  exportSalesReport,
  getProductsReport,
  exportProductsReport,
  getTopProducts,
  getPaymentModeBreakdown,
  getLowStock,
  getOutOfStock
} from './reports.controller.js';

const router = express.Router();

router.get('/sales', getSalesReport);
router.get('/sales/export', exportSalesReport);
router.get('/products', getProductsReport);
router.get('/products/export', exportProductsReport);
router.get('/top-products', getTopProducts);
router.get('/payment-mode', getPaymentModeBreakdown);
router.get('/low-stock', getLowStock);
router.get('/out-of-stock', getOutOfStock);

export default router;