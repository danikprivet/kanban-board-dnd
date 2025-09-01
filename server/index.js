const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errors');
const database = require('./utils/database');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const projectsRoutes = require('./routes/projects');
const columnsRoutes = require('./routes/columns');
const tasksRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const taskHistoryRoutes = require('./routes/task-history').router;
const projectUserRoutes = require('./routes/project-users').router;
const uploadRoutes = require('./routes/upload');

const app = express();

// Initialize database
async function initializeDatabase() {
  try {
    await database.connect();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors(config.server.cors));

// Handle preflight requests
app.options('*', cors(config.server.cors));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptime: process.uptime()
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/projects', projectsRoutes);
app.use('/columns', columnsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/comments', commentRoutes);
app.use('/task-history', taskHistoryRoutes);
app.use('/project-users', projectUserRoutes);
app.use('/upload', uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${config.server.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${config.server.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
