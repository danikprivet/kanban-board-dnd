const express = require('express');
const { dbGet, dbAll, dbRun } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get projects for a specific user (admin only)
router.get('/user/:userId', requireRole('admin'), async (req, res) => {
  const { userId } = req.params;
  
  try {
    const projects = await dbAll(`
      SELECT p.id, p.name, p.code
      FROM projects p
      JOIN project_users pu ON pu.project_id = p.id
      WHERE pu.user_id = ?
      ORDER BY p.name
    `, [userId]);
    
    res.json(projects);
  } catch (err) {
    console.error('Get user projects error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get project users
router.get('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;
  
  try {
    // Check if user has access to project
    const projectAccess = await dbGet(`
      SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?
    `, [projectId, userId]);
    
    if (!projectAccess) {
      return res.status(403).json({ error: 'Доступ к проекту запрещён' });
    }
    
    const users = await dbAll(`
      SELECT u.id, u.name, u.email, u.role, u.avatar_url
      FROM users u
      JOIN project_users pu ON pu.user_id = u.id
      WHERE pu.project_id = ?
      ORDER BY u.name
    `, [projectId]);
    
    res.json(users);
  } catch (err) {
    console.error('Get project users error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add user to project (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { projectId, userId } = req.body;
  
  if (!projectId || !userId) {
    return res.status(400).json({ error: 'projectId и userId обязательны' });
  }
  
  try {
    // Check if project exists
    const project = await dbGet('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    // Check if user exists
    const user = await dbGet('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Check if user already has access
    const existingAccess = await dbGet(`
      SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?
    `, [projectId, userId]);
    
    if (existingAccess) {
      return res.status(409).json({ error: 'Пользователь уже имеет доступ к проекту' });
    }
    
    // Add user to project
    await dbRun('INSERT INTO project_users (project_id, user_id) VALUES (?,?)', [projectId, userId]);
    
    res.status(201).json({ message: 'Пользователь добавлен к проекту' });
  } catch (err) {
    console.error('Add user to project error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Remove user from project (admin only)
router.delete('/:projectId/:userId', requireRole('admin'), async (req, res) => {
  const { projectId, userId } = req.params;
  
  try {
    // Check if user has access to project
    const projectAccess = await dbGet(`
      SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?
    `, [projectId, userId]);
    
    if (!projectAccess) {
      return res.status(404).json({ error: 'Пользователь не имеет доступа к проекту' });
    }
    
    // Remove user from project
    await dbRun('DELETE FROM project_users WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    
    res.json({ message: 'Пользователь удален из проекта' });
  } catch (err) {
    console.error('Remove user from project error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = { router };
