const pool = require('../config/db');

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.name as product_name, p.sku_code, p.current_quantity, p.min_quantity
       FROM alerts a
       JOIN products p ON a.product_id = p.id
       ORDER BY a.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active (unresolved) alerts
// @route   GET /api/alerts/active
// @access  Private
const getActiveAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.name as product_name, p.sku_code, p.current_quantity, p.min_quantity
       FROM alerts a
       JOIN products p ON a.product_id = p.id
       WHERE a.is_resolved = FALSE
       ORDER BY a.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resolve alert
// @route   PUT /api/alerts/:id/resolve
// @access  Private (owner, manager)
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE alerts 
       SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/alerts/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    // Total products
    const totalProducts = await pool.query('SELECT COUNT(*) FROM products');

    // Low stock products
    const lowStock = await pool.query(
      'SELECT COUNT(*) FROM products WHERE current_quantity < min_quantity'
    );

    // Out of stock products
    const outOfStock = await pool.query('SELECT COUNT(*) FROM products WHERE current_quantity = 0');

    // Total inventory value
    const inventoryValue = await pool.query(
      'SELECT SUM(current_quantity * cost_price) as total_value FROM products'
    );

    // Total transactions today
    const todayTransactions = await pool.query(
      `SELECT COUNT(*) FROM transactions 
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // Recent transactions (last 5)
    const recentTransactions = await pool.query(
      `SELECT t.*, p.name as product_name, u.name as performed_by_name
       FROM transactions t
       JOIN products p ON t.product_id = p.id
       JOIN users u ON t.performed_by = u.id
       ORDER BY t.created_at DESC
       LIMIT 5`
    );

    res.status(200).json({
      success: true,
      data: {
        totalProducts: parseInt(totalProducts.rows[0].count),
        lowStockProducts: parseInt(lowStock.rows[0].count),
        outOfStockProducts: parseInt(outOfStock.rows[0].count),
        totalInventoryValue: parseFloat(inventoryValue.rows[0].total_value || 0),
        todayTransactions: parseInt(todayTransactions.rows[0].count),
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAlerts,
  getActiveAlerts,
  resolveAlert,
  getDashboardStats,
};
