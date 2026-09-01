const express = require('express');
const dashboardService = require('../services/dashboardService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get aggregated dashboard stats, KPI cards, breakdowns, and 14-day trend line chart data (Goal #8)
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
