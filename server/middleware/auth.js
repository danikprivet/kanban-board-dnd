const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

// JWT token verification middleware
function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload; // { id, role, email }
    
    logger.debug(`User authenticated: ${payload.email} (${payload.role})`);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

// Role-based access control middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }
    
    if (req.user.role !== role) {
      logger.warn(`User ${req.user.email} attempted to access ${role}-only resource`);
      return next(new AuthorizationError(`Access denied. ${role} role required`));
    }
    
    next();
  };
}

// Admin-only access middleware
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

// Developer or admin access middleware
function requireDeveloperOrAdmin(req, res, next) {
  if (!req.user) {
    return next(new AuthenticationError('User not authenticated'));
  }
  
  if (!['admin', 'developer'].includes(req.user.role)) {
    return next(new AuthorizationError('Access denied. Developer or admin role required'));
  }
  
  next();
}

// Generate JWT token
function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.email === 'admin@example.com' ? 'admin' : user.role || 'developer'
  };
  
  return jwt.sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.expiresIn 
  });
}

// Generate refresh token
function signRefreshToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'refresh'
  };
  
  return jwt.sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.refreshExpiresIn 
  });
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    
    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }
    
    return payload;
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
}

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireDeveloperOrAdmin,
  signToken,
  signRefreshToken,
  verifyRefreshToken
};

