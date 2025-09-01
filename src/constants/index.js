// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Theme Configuration
export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  STORAGE_KEY: 'theme',
};

// Drag and Drop Configuration
export const DND_CONFIG = {
  ACTIVATION_DISTANCE: 8,
  DROP_ANIMATION_DURATION: 250,
  DROP_ANIMATION_EASING: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

// Task Status
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  DONE: 'done',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  THEME: 'theme',
  USER: 'user',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  UNKNOWN_ERROR: 'An unknown error occurred',
};
