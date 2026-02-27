function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: req.session.userId, username: req.session.username, role: req.session.role };
  next();
}

function csrfCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (process.env.NODE_ENV !== 'production') return next();
  const origin = req.get('Origin');
  const allowed = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : [];
  if (!origin || allowed.includes(origin)) return next();
  res.status(403).json({ error: 'Invalid origin' });
}

module.exports = { requireAuth, csrfCheck };
