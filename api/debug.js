module.exports = async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEBUG !== '1') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(200).json({
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};
