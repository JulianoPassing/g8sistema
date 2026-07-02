const { pingDatabase } = require('./mysql-pool');

function wantsDbCheck(req) {
  try {
    const raw = req.url || '';
    const qIdx = raw.indexOf('?');
    const search = qIdx >= 0 ? raw.slice(qIdx) : '';
    const u = new URL(search || '', 'http://health.local');
    return u.searchParams.get('db') === '1';
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  try {
    const base = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    };

    if (!wantsDbCheck(req)) {
      res.status(200).json(base);
      return;
    }

    const db = await pingDatabase();
    const payload = { ...base, db };
    res.status(db.ok ? 200 : 503).json(payload);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};
