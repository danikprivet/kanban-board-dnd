const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// Import new utilities
const database = require('../utils/database');
const { signToken, authMiddleware, requireRole } = require('../middleware/auth');
const { validateRequest, schemas } = require('../utils/validation');
const logger = require('../utils/logger');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only image files are allowed'));
    }
  }
});

// Login endpoint
router.post('/login', validateRequest(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await database.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = signToken(user);
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
          theme: user.theme
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register endpoint (admin only)
router.post('/register', requireRole('admin'), validateRequest(schemas.user), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await database.exists('users', { email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);
    
    // Create user
    const userData = {
      id: uuidv4(),
      email,
      name,
      password_hash,
      role: role || 'developer'
    };

    const newUser = await database.create('users', userData);
    
    logger.info(`New user registered: ${email} by admin`);
    
    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await database.findById('users', req.user.id, 'id, email, name, role, avatar_url, theme');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name, password, avatar_url, theme } = req.body;
    
    // Get current user
    const currentUser = await database.findById('users', req.user.id);
    
    // Prepare update data
    const updateData = {};
    
    if (name && name.trim().length >= 2) {
      updateData.name = name.trim();
    }
    
    if (password && password.length >= 6) {
      updateData.password_hash = bcrypt.hashSync(password, 10);
    }
    
    if (avatar_url) {
      updateData.avatar_url = avatar_url;
    }
    
    if (theme && ['light', 'dark'].includes(theme)) {
      updateData.theme = theme;
    }
    
    // Update user
    if (Object.keys(updateData).length > 0) {
      await database.update('users', req.user.id, updateData);
    }
    
    // Get updated user
    const updatedUser = await database.findById('users', req.user.id, 'id, email, name, role, avatar_url, theme');
    
    logger.info(`User profile updated: ${req.user.email}`);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Upload avatar
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('No avatar file provided');
    }

    const avatar_url = `/uploads/${req.file.filename}`;
    
    // Update user avatar
    await database.update('users', req.user.id, { avatar_url });
    
    logger.info(`Avatar uploaded for user: ${req.user.email}`);
    
    res.json({
      success: true,
      data: { avatar_url }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    const payload = require('../middleware/auth').verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await database.findById('users', payload.id);
    
    // Generate new tokens
    const newToken = signToken(user);
    const newRefreshToken = require('../middleware/auth').signRefreshToken(user);
    
    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
