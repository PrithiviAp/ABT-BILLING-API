import * as reportsService from './reports.service.js';
import { streamExport } from './reports.export.js';
import { getPagination } from './reports.utils.js';

export async function getSalesReport(req, res) {
  try {
    const { period = 'weekly', from, to } = req.query;
    const { page, limit } = getPagination(req.query);
    const data = await reportsService.getSalesData(period, from, to, page, limit);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate sales report' });
  }
}

export async function exportSalesReport(req, res) {
  try {
    const { period = 'weekly', from, to, format = 'xlsx' } = req.query;
    // export ignores pagination — always exports the full period's data
    const { rows } = await reportsService.getSalesData(period, from, to, 1, Number.MAX_SAFE_INTEGER);
    await streamExport(res, rows, format, `sales-${period}`, `Sales Report (${period})`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export sales report' });
  }
}

export async function getProductsReport(req, res) {
  try {
    const { page, limit } = getPagination(req.query);
    const data = await reportsService.getProductsData(page, limit);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate products report' });
  }
}

export async function exportProductsReport(req, res) {
  try {
    const { format = 'xlsx' } = req.query;
    const { rows } = await reportsService.getProductsData(1, Number.MAX_SAFE_INTEGER);
    await streamExport(res, rows, format, 'products', 'Product List');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export products report' });
  }
}

export async function getTopProducts(req, res) {
  try {
    const { period = 'monthly' } = req.query;
    const { page, limit } = getPagination(req.query);
    const data = await reportsService.getTopSellingProducts(period, page, limit);
    res.json({ period, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
}

export async function getPaymentModeBreakdown(req, res) {
  try {
    const { period = 'monthly' } = req.query;
    const { page, limit } = getPagination(req.query);
    const data = await reportsService.getPaymentModeBreakdown(period, page, limit);
    res.json({ period, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch payment breakdown' });
  }
}

export async function getLowStock(req, res) {
  try {
    const threshold = Number(req.query.threshold) || 80;   // ← now a % sold threshold
    const { page, limit } = getPagination(req.query);
    const data = await reportsService.getLowStockProducts(threshold, page, limit);
    res.json({ threshold, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch low stock report' });
  }
}