const { ValidationError } = require('./errors');

// Validation schemas
const schemas = {
  user: {
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50,
      message: 'Name must be between 2 and 50 characters'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
      message: 'Password must be at least 6 characters'
    },
    role: {
      required: true,
      type: 'string',
      enum: ['admin', 'developer'],
      message: 'Role must be either admin or developer'
    }
  },

  login: {
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
      message: 'Password must be at least 6 characters'
    }
  },

  project: {
    name: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 100,
      message: 'Project name must be between 3 and 100 characters'
    },
    code: {
      required: true,
      type: 'string',
      pattern: /^[A-Z0-9-]{2,10}$/,
      message: 'Project code must be 2-10 characters, A-Z, 0-9, -'
    }
  },

  task: {
    title: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      message: 'Task title must be between 1 and 200 characters'
    },
    description: {
      required: false,
      type: 'string',
      maxLength: 1000,
      message: 'Description must be less than 1000 characters'
    },
    priority: {
      required: false,
      type: 'string',
      enum: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    story_points: {
      required: false,
      type: 'number',
      min: 1,
      max: 100,
      message: 'Story points must be between 1 and 100'
    }
  },

  comment: {
    content: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      message: 'Comment content must be between 1 and 500 characters'
    }
  }
};

// Validation function
function validate(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation for undefined optional fields
    if (value === undefined || value === null) {
      continue;
    }

    // Check type and convert if needed
    if (rules.type) {
      if (rules.type === 'number' && typeof value === 'string' && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          data[field] = numValue; // Convert string to number
          continue;
        }
      }
      
      if (typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
        continue;
      }
    }

    // Check string length
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(rules.message || `${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(rules.message || `${field} must be less than ${rules.maxLength} characters`);
      }
    }

    // Check number range
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(rules.message || `${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(rules.message || `${field} must be at most ${rules.max}`);
      }
    }

    // Check enum values
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(rules.message || `${field} must be one of: ${rules.enum.join(', ')}`);
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || `${field} format is invalid`);
    }
  }

  if (errors.length > 0) {
    const errorMessage = errors.length === 1 ? errors[0] : `Validation failed: ${errors.join(', ')}`;
    throw new ValidationError(errorMessage, errors);
  }

  return true;
}

// Middleware for route validation
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const data = { ...req.body, ...req.params, ...req.query };
      validate(data, schema);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  schemas,
  validate,
  validateRequest
};
