module.exports = async (req, res) => {
  console.log('=== DEBUG API ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('x-vercel-path:', req.headers['x-vercel-path']);
  console.log('x-vercel-original-url:', req.headers['x-vercel-original-url']);
  console.log('x-vercel-deployment-url:', req.headers['x-vercel-deployment-url']);
  console.log('All Headers:', Object.keys(req.headers).filter(key => key.startsWith('x-vercel')));
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('================');
  
  res.status(200).json({
    method: req.method,
    url: req.url,
    x_vercel_path: req.headers['x-vercel-path'],
    x_vercel_original_url: req.headers['x-vercel-original-url'],
    x_vercel_deployment_url: req.headers['x-vercel-deployment-url'],
    vercel_headers: Object.keys(req.headers).filter(key => key.startsWith('x-vercel')),
    all_headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });
};
