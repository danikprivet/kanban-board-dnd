const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Import utilities
const { dbGet, dbAll, dbRun } = require('../db');
const { requireRole, requireDeveloperOrAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../utils/validation');
const { addHistoryEntry } = require('./task-history');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

const router = express.Router();

// Get tasks by project
router.get('/by-project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Get columns
    const columns = await dbAll(`
      SELECT * FROM columns WHERE project_id = ? ORDER BY position
    `, [projectId]);
    
    // Get tasks with assignee and project info
    const tasks = await dbAll(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar, p.code as project_code
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id = ?
      ORDER BY t.column_id, t.position
    `, [projectId]);
    
    // Group tasks by column
    const tasksByColumn = {};
    columns.forEach(col => {
      tasksByColumn[col.id] = tasks.filter(t => t.column_id === col.id);
    });
    
    logger.debug(`Tasks retrieved for project ${projectId}`);
    
    res.json({
      success: true,
      data: { columns, tasksByColumn }
    });
  } catch (error) {
    next(error);
  }
});

// Create new task
router.post('/', validateRequest(schemas.task), async (req, res, next) => {
  try {
    const { projectId, columnId, title, description, priority, assignee_id, tag, story_points } = req.body;
    
    // Validate required fields
    if (!projectId || !columnId) {
      throw new ValidationError('projectId and columnId are required');
    }
    
    // Get max position in column
    const maxPos = await dbGet(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE column_id = ?
    `, [columnId]);
    
    // Get max seq in project
    const maxSeq = await dbGet(`
      SELECT COALESCE(MAX(seq), 0) as max_seq FROM tasks WHERE project_id = ?
    `, [projectId]);
    
    const position = maxPos.max_pos + 1;
    const seq = maxSeq.max_seq + 1;
    
    // Create task
    const taskData = {
      id: uuidv4(),
      project_id: projectId,
      column_id: columnId,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'medium',
      assignee_id: assignee_id || null,
      tag: tag ? tag.trim() : '',
      story_points: story_points || null,
      seq,
      position,
      created_at: new Date().toISOString()
    };
    
    const columns = Object.keys(taskData);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO tasks (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const result = await dbRun(sql, Object.values(taskData));
    const newTask = { ...taskData, id: result.lastID || taskData.id };
    
    // Add to history
    const historyData = { title: newTask.title };
    if (newTask.description) historyData.description = newTask.description;
    if (newTask.priority) historyData.priority = newTask.priority;
    if (newTask.assignee_id) historyData.assignee_id = newTask.assignee_id;
    if (newTask.tag) historyData.tag = newTask.tag;
    if (newTask.story_points) historyData.story_points = newTask.story_points;
    
    // Temporarily skip history for now
    // await addHistoryEntry(newTask.id, req.user.id, 'task_created', historyData);
    
    // Get created task with full info
    const createdTask = await dbGet(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar, p.code as project_code
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `, [newTask.id]);
    
    logger.info(`New task created: ${title} in project ${projectId}`);
    
    res.status(201).json({
      success: true,
      data: createdTask
    });
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await dbGet(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar, p.code as project_code
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `, [id]);
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get current task
    const currentTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!currentTask) {
      throw new NotFoundError('Task not found');
    }
    
    // Prepare update data
    const validFields = ['title', 'description', 'priority', 'assignee_id', 'tag', 'story_points'];
    const filteredData = {};
    
    validFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] === 'string') {
          filteredData[field] = updateData[field].trim();
        } else {
          filteredData[field] = updateData[field];
        }
      }
    });
    
    // Update task
    if (Object.keys(filteredData).length > 0) {
      const updateFields = Object.keys(filteredData).map(field => `${field} = ?`).join(', ');
      const updateValues = Object.values(filteredData);
      const sql = `UPDATE tasks SET ${updateFields} WHERE id = ?`;
      await dbRun(sql, [...updateValues, id]);
    }
    
    // Get updated task
    const updatedTask = await dbGet(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar, p.code as project_code
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `, [id]);
    
    // Add to history
    const changes = [];
    Object.keys(filteredData).forEach(field => {
      if (currentTask[field] !== filteredData[field]) {
        changes.push({
          field,
          oldValue: currentTask[field],
          newValue: filteredData[field]
        });
      }
    });
    
    if (changes.length > 0) {
      await addHistoryEntry(id, req.user.id, 'task_updated', { changes });
    }
    
    logger.info(`Task ${id} updated`);
    
    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
});

// Move task (drag and drop)
router.post('/move', async (req, res, next) => {
  try {
    const { taskId, sourceColumnId, sourceIndex, destColumnId, destIndex } = req.body;
    
    if (!taskId || !destColumnId || destIndex === undefined) {
      throw new ValidationError('taskId, destColumnId and destIndex are required');
    }
    
    // Get task
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Get column names for history
    const destColumn = await dbGet('SELECT name FROM columns WHERE id = ?', [destColumnId]);
    const sourceColumn = sourceColumnId ? 
      await dbGet('SELECT name FROM columns WHERE id = ?', [sourceColumnId]) : 
      await dbGet('SELECT name FROM columns WHERE id = ?', [task.column_id]);
    
    // Update task position and column
    await dbRun(`
      UPDATE tasks 
      SET column_id = ?, position = ? 
      WHERE id = ?
    `, [destColumnId, destIndex, taskId]);
    
    // Temporarily skip history for now
    // await addHistoryEntry(taskId, req.user.id, 'task_moved', {
    //   fromColumn: sourceColumn?.name || 'unknown',
    //   toColumn: destColumn?.name || 'unknown',
    //   taskTitle: task.title
    // });
    
    logger.info(`Task ${taskId} moved from ${sourceColumn?.name} to ${destColumn?.name}`);
    
    res.json({
      success: true,
      message: 'Task moved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get task
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Temporarily skip history for now
    // await addHistoryEntry(id, req.user.id, 'task_deleted', {
    //   taskTitle: task.title,
    //   taskDescription: task.description
    // });
    
    // Delete task
    await dbRun('DELETE FROM tasks WHERE id = ?', [id]);
    
    logger.info(`Task ${id} deleted`);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
