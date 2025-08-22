const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate user based on JWT token
const JWT_SECRET = process.env.JWT_SECRET;

exports.authenticate = async (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.deleted) {
      return res.status(401).json({ error: 'Invalid token or user' });
    }

    req.user = user; // attach to req
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
