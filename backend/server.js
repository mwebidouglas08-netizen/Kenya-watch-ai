require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDB } = require('./db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use('/api/ai', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many requests, slow down.' }
}));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 100 }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KenyaWatch AI Backend',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ghost-projects', require('./routes/ghostProjects'));
app.use('/api/ai', require('./routes/ai'));

// ── Dashboard stats ───────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const { pool } = require('./db');
  try {
    const [contracts, reports, ghosts] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE risk_level = 'HIGH') AS flagged_today,
          COALESCE(SUM(value) FILTER (WHERE risk_level = 'HIGH'), 0) AS funds_at_risk
        FROM contracts
      `),
      pool.query(`
        SELECT COUNT(*) AS total
        FROM reports
        WHERE created_at > NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE detection_status IN ('ghost','partial')) AS ghost_count
        FROM ghost_projects
      `)
    ]);
    res.json({
      success: true,
      data: {
        contracts_flagged: parseInt(contracts.rows[0].flagged_today),
        ghost_projects:    parseInt(ghosts.rows[0].ghost_count),
        reports_30d:       parseInt(reports.rows[0].total),
        funds_at_risk:     parseInt(contracts.rows[0].funds_at_risk)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 & Error handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 KenyaWatch backend running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
