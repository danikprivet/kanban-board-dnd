const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { requireRole, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get columns for a project
router.get('/by-project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    
    const columns = await dbAll(`
      SELECT * FROM columns WHERE project_id = ? ORDER BY position
    `, [projectId]);
    
    res.json({ columns });
  } catch (err) {
    console.error('Get columns error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create new column
router.post('/', async (req, res) => {
  const { projectId, name } = req.body;
  if (!projectId || !name) return res.status(400).json({ error: 'projectId и name обязательны' });
  
  try {
    
    // Get max position
    const maxPos = await dbGet(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM columns WHERE project_id = ?
    `, [projectId]);
    
    const position = maxPos.max_pos + 1;
    const id = uuidv4();
    
    await dbRun(`
      INSERT INTO columns (id, project_id, name, position) VALUES (?,?,?,?)
    `, [id, projectId, name, position]);
    
    const created = await dbGet('SELECT * FROM columns WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create column error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update column
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) return res.status(400).json({ error: 'name обязателен' });
  
  try {
    // Get column
    const column = await dbGet('SELECT * FROM columns WHERE id = ?', [id]);
    
    if (!column) {
      return res.status(404).json({ error: 'Колонка не найдена' });
    }
    
    await dbRun('UPDATE columns SET name = ? WHERE id = ?', [name, id]);
    
    const updated = await dbGet('SELECT * FROM columns WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Update column error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Delete column
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get column
    const column = await dbGet('SELECT * FROM columns WHERE id = ?', [id]);
    
    if (!column) {
      return res.status(404).json({ error: 'Колонка не найдена' });
    }
    
    await dbRun('DELETE FROM columns WHERE id = ?', [id]);
    res.json({ message: 'Колонка удалена' });
  } catch (err) {
    console.error('Delete column error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Reorder columns
router.post('/reorder', async (req, res) => {
  const { projectId, columnOrder } = req.body;
  
  if (!projectId || !columnOrder || !Array.isArray(columnOrder)) {
    return res.status(400).json({ error: 'projectId и columnOrder обязательны' });
  }
  
  try {
    
    // Update positions in transaction
    for (let i = 0; i < columnOrder.length; i++) {
      const { id, position } = columnOrder[i];
      await dbRun('UPDATE columns SET position = ? WHERE id = ? AND project_id = ?', [i, id, projectId]);
    }
    
    res.json({ message: 'Порядок столбцов обновлён' });
  } catch (err) {
    console.error('Reorder columns error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

