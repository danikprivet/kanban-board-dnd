const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireRole('admin'), async (_req, res) => {
  try {
    const users = await dbAll('SELECT id, email, name, role, avatar_url FROM users ORDER BY email');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, email, role, password, avatar_url } = req.body;
      if (!name || name.length < 1) return res.status(400).json({ error: 'Имя обязательно' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Некорректный email' });
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/.test(password)) return res.status(400).json({ error: 'Пароль 6-50 символов, буквы и цифры' });
    if (!['admin', 'developer'].includes(role)) return res.status(400).json({ error: 'Некорректная роль' });

  try {
    const exists = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ error: 'Пользователь уже существует' });

    // Get next ID
    const maxId = await dbGet('SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) as max_id FROM users');
    const id = (maxId.max_id + 1).toString();
    const password_hash = bcrypt.hashSync(password, 10);
    await dbRun('INSERT INTO users (id, email, name, password_hash, role, avatar_url) VALUES (?,?,?,?,?,?)', [id, email, name, password_hash, role, avatar_url || null]);
    res.status(201).json({ id, email, name, role, avatar_url: avatar_url || null });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, password, role, avatar_url } = req.body;
  
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Не найден' });

    let password_hash = user.password_hash;
    if (password) {
      if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/.test(password)) return res.status(400).json({ error: 'Пароль 6-50 символов, буквы и цифры' });
      password_hash = bcrypt.hashSync(password, 10);
    }
    
    const newRole = role && ['admin','developer'].includes(role) ? role : user.role;
    const newName = typeof name === 'string' && name.length >= 1 ? name : user.name;
    const newAvatar = avatar_url !== undefined ? avatar_url : user.avatar_url;

    await dbRun('UPDATE users SET name=?, password_hash=?, role=?, avatar_url=? WHERE id=?', [newName, password_hash, newRole, newAvatar, id]);
    const updated = await dbGet('SELECT id, email, name, role, avatar_url FROM users WHERE id=?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    
    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Нельзя удалить администратора' });
    }
    
    // Delete user and all related data
    await dbRun('DELETE FROM comments WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM project_users WHERE user_id = ?', [id]);
    await dbRun('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?', [id]);
    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

