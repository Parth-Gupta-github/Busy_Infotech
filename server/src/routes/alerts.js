const express = require('express');
const alertService = require('../services/alertService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get active slow orders open longer than thresholdMinutes (Goal #10)
router.get('/slow-orders', authenticateToken, async (req, res, next) => {
  try {
    const thresholdMinutes = parseInt(req.query.thresholdMinutes, 10) || 15;
    const suppressMinutes = parseInt(req.query.suppressMinutes, 10) || 10;
    const data = await alertService.getSlowOrders(thresholdMinutes, suppressMinutes);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Acknowledge a slow order alert for current user (suppresses re-alert for 10 mins)
router.post('/acknowledge', authenticateToken, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      const error = new Error('orderId is required.');
      error.status = 400;
      throw error;
    }

    const ack = await alertService.acknowledgeSlowOrder(orderId, req.user.id);
    res.json({ message: 'Slow-order alert acknowledged successfully.', acknowledgment: ack });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
