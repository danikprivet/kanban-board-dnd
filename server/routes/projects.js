const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Import new utilities
const { dbGet, dbAll, dbRun } = require('../db');
const { requireRole, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../utils/validation');

const logger = require('../utils/logger');
const { ConflictError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// Helper function to create default columns for a project
async function createDefaultColumns(projectId) {
  const defaultColumns = [
    { name: 'К работе', position: 0 },
    { name: 'В процессе', position: 1 },
    { name: 'Кодревью', position: 2 },
    { name: 'Тестирование', position: 3 },
    { name: 'Готово', position: 4 }
  ];
  
  const columnQueries = defaultColumns.map(col => ({
    sql: 'INSERT INTO columns (id, project_id, name, position) VALUES (?,?,?,?)',
    params: [uuidv4(), projectId, col.name, col.position]
  }));
  
  // Use individual queries instead of transaction
  for (const query of columnQueries) {
    await dbRun(query.sql, query.params);
  }
}

// List projects available to current user
router.get('/', async (req, res, next) => {
  try {
    // Get all projects for now (temporary fix)
    const projects = await dbAll(`
      SELECT p.id, p.code, p.name, p.created_at
      FROM projects p
      ORDER BY p.name
    `);
    
    logger.info(`Retrieved ${projects.length} projects`);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
});

// Create project (admin only)
router.post('/', requireAdmin, validateRequest(schemas.project), async (req, res, next) => {
  try {
    const { name, code } = req.body;

    // Check if project with this code already exists
    const existingProject = await dbGet('SELECT 1 FROM projects WHERE code = ?', [code]);
    if (existingProject) {
      throw new ConflictError('Project with this code already exists');
    }

    // Create project
    const projectData = {
      id: uuidv4(),
      code: code.toUpperCase(),
      name: name.trim(),
      created_at: new Date().toISOString()
    };

    const newProject = await dbRun('INSERT INTO projects (id, code, name, created_at) VALUES (?,?,?,?)', 
      [projectData.id, projectData.code, projectData.name, projectData.created_at]);
    const insertedProject = { ...projectData, id: newProject.lastID || projectData.id };
    
    // Link admin user to project (temporary fix)
    const adminUser = await dbGet('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
    if (adminUser) {
      await dbRun('INSERT INTO project_users (project_id, user_id) VALUES (?,?)', 
        [insertedProject.id, adminUser.id]);
    }
    
    // Create default columns
    await createDefaultColumns(newProject.id);
    
    logger.info(`New project created: ${newProject.name} (${newProject.code}) by ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      data: newProject
    });
  } catch (error) {
    next(error);
  }
});

// Get project by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    logger.debug(`Project ${id} retrieved`);
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Get project users (for assignee selection)
router.get('/:id/users', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const users = await dbAll(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.role
      FROM users u
      JOIN project_users pu ON pu.user_id = u.id
      WHERE pu.project_id = ?
      ORDER BY u.name
    `, [id]);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Update project (admin only)
router.put('/:id', requireAdmin, validateRequest(schemas.project), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    
    // Check if code is already taken by another project
    if (code) {
      const existingProject = await dbGet('SELECT id FROM projects WHERE code = ? AND id != ?', [code, id]);
      if (existingProject) {
        throw new ConflictError('Project with this code already exists');
      }
    }
    
    // Update project
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (code) updateData.code = code.toUpperCase();
    
    // Update project fields
    if (updateData.name) {
      await dbRun('UPDATE projects SET name = ? WHERE id = ?', [updateData.name, id]);
    }
    if (updateData.code) {
      await dbRun('UPDATE projects SET code = ? WHERE id = ?', [updateData.code, id]);
    }
    
    // Get updated project
    const updatedProject = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    
    logger.info(`Project ${id} updated`);
    
    res.json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    next(error);
  }
});

// Delete project (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get project info for logging
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Delete project (cascade will handle related records)
    await dbRun('DELETE FROM projects WHERE id = ?', [id]);
    
    logger.info(`Project ${project.name} (${project.code}) deleted`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get project statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get task counts by column
    const taskStats = await dbAll(`
      SELECT c.name as column_name, COUNT(t.id) as task_count
      FROM columns c
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE c.project_id = ?
      GROUP BY c.id, c.name
      ORDER BY c.position
    `, [id]);
    
    // Get total users
    const userCountResult = await dbGet('SELECT COUNT(*) as count FROM project_users WHERE project_id = ?', [id]);
    const userCount = userCountResult.count;
    
    // Get total tasks
    const totalTasksResult = await dbGet('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?', [id]);
    const totalTasks = totalTasksResult.count;
    
    const stats = {
      columns: taskStats,
      totalUsers: userCount,
      totalTasks: totalTasks
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

