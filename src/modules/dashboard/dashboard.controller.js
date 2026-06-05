import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import { getDashboardStats } from './dashboard.service.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  sendSuccess(res, stats);
});