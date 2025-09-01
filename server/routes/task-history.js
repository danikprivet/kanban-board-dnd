const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get task history
router.get('/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;
  
  try {
    // Check if user has access to task
    const taskAccess = await dbGet(`
      SELECT 1 FROM tasks t
      JOIN project_users pu ON pu.project_id = t.project_id
      WHERE t.id = ? AND pu.user_id = ?
    `, [taskId, userId]);
    
    if (!taskAccess) {
      return res.status(403).json({ error: 'Доступ к задаче запрещён' });
    }
    
    const history = await dbAll(`
      SELECT 
        th.id,
        th.action,
        th.payload,
        th.created_at,
        u.name as user_name,
        u.email as user_email
      FROM task_history th
      LEFT JOIN users u ON u.id = th.user_id
      WHERE th.task_id = ?
      ORDER BY th.created_at DESC
    `, [taskId]);
    
    res.json(history);
  } catch (err) {
    console.error('Get task history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add history entry
async function addHistoryEntry(taskId, userId, action, payload = null) {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    await dbRun(`
      INSERT INTO task_history (id, task_id, user_id, action, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, taskId, userId, action, payload ? JSON.stringify(payload) : null, now]);
  } catch (err) {
    console.error('Error adding history entry:', err);
  }
}

module.exports = { router, addHistoryEntry };
