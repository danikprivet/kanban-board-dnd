const { dbGet } = require('../db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const { authMiddleware } = require('./auth');

// Check if user has access to project
async function checkProjectAccess(projectId, userId) {
  const access = await dbGet('SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  
  if (!access) {
    throw new AuthorizationError('Access to project denied');
  }
  
  return true;
}

// Middleware to check project access
function requireProjectAccess() {
  return [
    authMiddleware,
    async (req, res, next) => {
      try {
        // Try different possible parameter names
        const projectId = req.params.projectId || req.params.id || req.body.projectId;
        
        if (!projectId) {
          return next(new Error('Project ID is required'));
        }
        
        if (!req.user || !req.user.id) {
          return next(new Error('User not authenticated'));
        }
        
        await checkProjectAccess(projectId, req.user.id);
        next();
      } catch (error) {
        next(error);
      }
    }
  ];
}

// Middleware to check if user is project owner or admin
function requireProjectOwner() {
  return [
    authMiddleware,
    async (req, res, next) => {
      try {
        // Try different possible parameter names
        const projectId = req.params.projectId || req.params.id || req.body.projectId;
        
        if (!projectId) {
          return next(new Error('Project ID is required'));
        }
        
        // Check if user is admin
        if (req.user.role === 'admin') {
          return next();
        }
        
        // Check if user is project owner (you might want to add owner field to projects table)
        // For now, we'll just check if user has access
        await checkProjectAccess(projectId, req.user.id);
        next();
      } catch (error) {
        next(error);
      }
    }
  ];
}

// Middleware to check if user can manage tasks in project
function requireTaskManagement() {
  return [
    authMiddleware,
    async (req, res, next) => {
      try {
        // Try different possible parameter names
        const projectId = req.params.projectId || req.params.id || req.body.projectId;
        
        if (!projectId) {
          return next(new Error('Project ID is required'));
        }
        
        // Check if user has access to project
        await checkProjectAccess(projectId, req.user.id);
        
        // Check if user can manage tasks (admin or developer with access)
        if (req.user.role === 'admin') {
          return next();
        }
        
        // For developers, check if they have specific permissions
        // This could be extended with a permissions table
        next();
      } catch (error) {
        next(error);
      }
    }
  ];
}

// Get user's projects
async function getUserProjects(userId) {
  const sql = `
    SELECT p.*, pu.user_id
    FROM projects p
    JOIN project_users pu ON p.id = pu.project_id
    WHERE pu.user_id = ?
    ORDER BY p.name
  `;
  
  return await dbGet(sql, [userId]);
}

// Check if user can access specific resource
async function canAccessResource(resourceType, resourceId, userId) {
  switch (resourceType) {
    case 'project':
      return await checkProjectAccess(resourceId, userId);
    
    case 'task':
      const task = await dbGet(`
        SELECT t.project_id 
        FROM tasks t
        JOIN project_users pu ON t.project_id = pu.project_id
        WHERE t.id = ? AND pu.user_id = ?
      `, [resourceId, userId]);
      
      if (!task) {
        throw new AuthorizationError('Access to task denied');
      }
      
      return true;
    
    case 'comment':
      const comment = await dbGet(`
        SELECT c.task_id
        FROM comments c
        JOIN tasks t ON c.task_id = t.id
        JOIN project_users pu ON t.project_id = pu.project_id
        WHERE c.id = ? AND pu.user_id = ?
      `, [resourceId, userId]);
      
      if (!comment) {
        throw new AuthorizationError('Access to comment denied');
      }
      
      return true;
    
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}

module.exports = {
  checkProjectAccess,
  requireProjectAccess,
  requireProjectOwner,
  requireTaskManagement,
  getUserProjects,
  canAccessResource
};

