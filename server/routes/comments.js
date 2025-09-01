const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { addHistoryEntry } = require('./task-history');

const router = express.Router();

// Get comments for a task
router.get('/by-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;
  
  try {
    // Check if user has access to project
    const taskAccess = await dbGet(`
      SELECT 1 FROM tasks t
      JOIN project_users pu ON pu.project_id = t.project_id
      WHERE t.id = ? AND pu.user_id = ?
    `, [taskId, userId]);
    
    if (!taskAccess) {
      return res.status(403).json({ error: 'Доступ к задаче запрещён' });
    }
    
    const comments = await dbAll(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `, [taskId]);
    
    res.json(comments);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create new comment
router.post('/', async (req, res) => {
  const { taskId, content } = req.body;
  
  if (!taskId || !content) {
    return res.status(400).json({ error: 'taskId и content обязательны' });
  }
  
  try {
    // Check if user has access to project
    const taskAccess = await dbGet(`
      SELECT 1 FROM tasks t
      JOIN project_users pu ON pu.project_id = t.project_id
      WHERE t.id = ? AND pu.user_id = ?
    `, [taskId, req.user.id]);
    
    if (!taskAccess) {
      return res.status(403).json({ error: 'Доступ к задаче запрещён' });
    }
    
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    await dbRun(`
      INSERT INTO comments (id, task_id, user_id, content, created_at)
      VALUES (?,?,?,?,?)
    `, [id, taskId, req.user.id, content, createdAt]);
    
    // Add to task history
    await addHistoryEntry(taskId, req.user.id, 'comment_added', {
      content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });
    
    const created = await dbGet(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);
    
    res.status(201).json(created);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update comment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'content обязателен' });
  }
  
  try {
    // Check if user owns the comment and has access to project
    const comment = await dbGet(`
      SELECT c.* FROM comments c
      JOIN tasks t ON c.task_id = t.id
      JOIN project_users pu ON pu.project_id = t.project_id
      WHERE c.id = ? AND c.user_id = ? AND pu.user_id = ?
    `, [id, req.user.id, req.user.id]);
    
    if (!comment) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }
    
    await dbRun('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
    
    const updated = await dbGet(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);
    
    res.json(updated);
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Delete comment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if user owns the comment and has access to project
    const comment = await dbGet(`
      SELECT c.* FROM comments c
      JOIN tasks t ON c.task_id = t.id
      JOIN project_users pu ON pu.project_id = t.project_id
      WHERE c.id = ? AND c.user_id = ? AND pu.user_id = ?
    `, [id, req.user.id, req.user.id]);
    
    if (!comment) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }
    
    await dbRun('DELETE FROM comments WHERE id = ?', [id]);
    res.json({ message: 'Комментарий удалён' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
