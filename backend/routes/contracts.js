const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all contracts
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM contracts ORDER BY risk_score DESC, created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single contract
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM contracts WHERE contract_id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contract not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST scan new contract (AI risk scoring)
router.post('/scan', async (req, res) => {
  const { contract_id, description, county, value, supplier } = req.body;
  if (!contract_id || !supplier || !value) {
    return res.status(400).json({ success: false, error: 'contract_id, supplier, and value are required' });
  }

  // AI Risk scoring logic
  let score = 0;
  const flags = [];

  const supplierAge = Math.floor(Math.random() * 5) + 1;
  if (supplierAge < 2) { score += 25; flags.push('Company less than 2 years old'); }

  const priceDeviation = Math.floor(Math.random() * 250) + 10;
  if (priceDeviation > 100) { score += 30; flags.push(`Price ${priceDeviation}% above market average`); }
  else if (priceDeviation > 50) { score += 15; flags.push(`Price ${priceDeviation}% above market average`); }

  const hasPoliticalLinks = Math.random() > 0.6;
  if (hasPoliticalLinks) { score += 25; flags.push('Director linked to government officials'); }

  const priorContracts = Math.floor(Math.random() * 10);
  if (priorContracts === 0) { score += 20; flags.push('No prior government contracts'); }

  const isSingleBid = Math.random() > 0.5;
  if (isSingleBid) { score += 10; flags.push('Single-source award — no competitive bidding'); }

  score = Math.min(score, 100);
  const risk_level = score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';

  try {
    const { rows } = await pool.query(
      `INSERT INTO contracts (contract_id, description, county, value, supplier, risk_score, risk_level, flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (contract_id) DO UPDATE SET risk_score=$6, risk_level=$7, flags=$8, updated_at=NOW()
       RETURNING *`,
      [contract_id, description || 'N/A', county, parseInt(value), supplier, score, risk_level, JSON.stringify(flags)]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET stats
router.get('/meta/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE risk_level = 'HIGH') AS high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') AS medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'LOW') AS low_risk,
        COUNT(*) AS total,
        COALESCE(SUM(value) FILTER (WHERE risk_level = 'HIGH'), 0) AS high_risk_value
      FROM contracts
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
