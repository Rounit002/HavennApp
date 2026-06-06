module.exports = (pool) => {
  const express = require('express');
  const router = express.Router();
  const { checkAdmin } = require('./auth');

  router.get('/', checkAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM products WHERE library_id = $1 ORDER BY name', [req.libraryId]);
      res.json({ products: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', checkAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: 'Product name is required' });
      const result = await pool.query(
        'INSERT INTO products (name, library_id) VALUES ($1, $2) RETURNING *',
        [name, req.libraryId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/:id', checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name } = req.body;
      const result = await pool.query(
        'UPDATE products SET name = $1 WHERE id = $2 AND library_id = $3 RETURNING *',
        [name, id, req.libraryId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await pool.query('DELETE FROM products WHERE id = $1 AND library_id = $2 RETURNING *', [id, req.libraryId]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
      res.json({ message: 'Product deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};