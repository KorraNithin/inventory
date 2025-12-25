const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getActiveAlerts,
  resolveAlert,
  getDashboardStats,
} = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.get('/active', protect, getActiveAlerts);
router.get('/dashboard', protect, getDashboardStats);
router.put('/:id/resolve', protect, authorize('owner', 'manager'), resolveAlert);

module.exports = router;
