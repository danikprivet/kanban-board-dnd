require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 4000,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: function (origin, callback) {
        // Разрешаем запросы без origin (например, от мобильных приложений)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];
        
        // Добавляем кастомные origins из переменной окружения
        if (process.env.CORS_ORIGIN) {
          allowedOrigins.push(...process.env.CORS_ORIGIN.split(','));
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },

  // Database configuration
  database: {
    path: process.env.DB_PATH || './app.db',
    timeout: 30000,
    verbose: process.env.NODE_ENV === 'development'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // File upload configuration
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    path: './uploads'
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};
