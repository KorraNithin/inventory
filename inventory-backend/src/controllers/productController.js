const pool = require('../config/db');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products';
    let params = [];
    let conditions = [];

    // Filter by category
    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    // Search by name or SKU
    if (search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR sku_code ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (owner, manager)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku_code,
      category,
      unit,
      cost_price,
      selling_price,
      current_quantity,
      min_quantity,
      location,
      description,
    } = req.body;

    // Validation
    if (!name || !sku_code || !category || !unit || !cost_price || !selling_price) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if SKU already exists
    const skuExists = await pool.query('SELECT * FROM products WHERE sku_code = $1', [sku_code]);

    if (skuExists.rows.length > 0) {
      return res.status(400).json({ message: 'SKU code already exists' });
    }

    const result = await pool.query(
      `INSERT INTO products 
       (name, sku_code, category, unit, cost_price, selling_price, current_quantity, min_quantity, location, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        sku_code,
        category,
        unit,
        cost_price,
        selling_price,
        current_quantity || 0,
        min_quantity || 10,
        location,
        description,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (owner, manager)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku_code,
      category,
      unit,
      cost_price,
      selling_price,
      current_quantity,
      min_quantity,
      location,
      description,
    } = req.body;

    // Check if product exists
    const productExists = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (productExists.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku_code = $2, category = $3, unit = $4, cost_price = $5, 
           selling_price = $6, current_quantity = $7, min_quantity = $8, location = $9, description = $10
       WHERE id = $11
       RETURNING *`,
      [name, sku_code, category, unit, cost_price, selling_price, current_quantity, min_quantity, location, description, id]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (owner only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
