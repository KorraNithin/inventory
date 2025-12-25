const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransaction,
  createTransaction,
  getProductTransactions,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransaction);
router.post('/', protect, createTransaction);
router.get('/product/:productId', protect, getProductTransactions);

module.exports = router;
