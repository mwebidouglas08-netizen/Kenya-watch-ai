const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFound };
