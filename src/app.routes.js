import express from 'express';

import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/product.routes.js';
import billRoutes from './modules/bills/bill.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/bills', billRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;