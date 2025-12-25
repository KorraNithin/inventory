const pool = require('../config/db');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { type, product_id, limit = 50 } = req.query;
    
    let query = `
      SELECT t.*, p.name as product_name, p.sku_code, u.name as performed_by_name
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      JOIN users u ON t.performed_by = u.id
    `;
    
    let params = [];
    let conditions = [];

    if (type) {
      conditions.push(`t.type = $${params.length + 1}`);
      params.push(type);
    }

    if (product_id) {
      conditions.push(`t.product_id = $${params.length + 1}`);
      params.push(product_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC';
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, p.name as product_name, p.sku_code, u.name as performed_by_name
       FROM transactions t
       JOIN products p ON t.product_id = p.id
       JOIN users u ON t.performed_by = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new transaction (Stock IN or OUT)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { product_id, type, quantity, price_per_unit, reference_number, notes } = req.body;

    // Validation
    if (!product_id || !type || !quantity || !price_per_unit) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (type !== 'IN' && type !== 'OUT') {
      return res.status(400).json({ message: 'Type must be IN or OUT' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Get product
    const productResult = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Check if OUT transaction has enough stock
    if (type === 'OUT' && product.current_quantity < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.current_quantity}, Requested: ${quantity}`,
      });
    }

    // Calculate total amount
    const total_amount = quantity * price_per_unit;

    // Create transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions 
       (product_id, type, quantity, price_per_unit, total_amount, reference_number, notes, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [product_id, type, quantity, price_per_unit, total_amount, reference_number, notes, req.user.id]
    );

    // Update product quantity
    let newQuantity;
    if (type === 'IN') {
      newQuantity = product.current_quantity + quantity;
    } else {
      newQuantity = product.current_quantity - quantity;
    }

    await client.query('UPDATE products SET current_quantity = $1 WHERE id = $2', [newQuantity, product_id]);

    // Check if we need to create alert
    if (newQuantity < product.min_quantity) {
      // Check if alert already exists
      const existingAlert = await client.query(
        'SELECT * FROM alerts WHERE product_id = $1 AND is_resolved = FALSE AND alert_type = $2',
        [product_id, newQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK']
      );

      if (existingAlert.rows.length === 0) {
        const alertType = newQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        const message = newQuantity === 0
          ? `${product.name} is out of stock!`
          : `${product.name} stock is low. Current: ${newQuantity}, Minimum: ${product.min_quantity}`;

        await client.query(
          'INSERT INTO alerts (product_id, alert_type, message) VALUES ($1, $2, $3)',
          [product_id, alertType, message]
        );
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: transactionResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// @desc    Get transactions for a specific product
// @route   GET /api/transactions/product/:productId
// @access  Private
const getProductTransactions = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT t.*, u.name as performed_by_name
       FROM transactions t
       JOIN users u ON t.performed_by = u.id
       WHERE t.product_id = $1
       ORDER BY t.created_at DESC`,
      [productId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get product transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  getProductTransactions,
};
