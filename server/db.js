const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'app.db');
let db;

// Create tables if not exist
const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      

      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
      
      // Create tables
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin','developer')),
          avatar_url TEXT
        )`, (err) => {
          if (err) console.error('Error creating users table:', err.message);
        });
        
        // Try to add theme column if it doesn't exist
        db.run('ALTER TABLE users ADD COLUMN theme TEXT', (err) => {
          // Column might already exist, ignore error
        });

        db.run(`CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT
        )`, (err) => {
          if (err) console.error('Error creating projects table:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS project_users (
          project_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          PRIMARY KEY (project_id, user_id),
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating project_users table:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS columns (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating columns table:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          column_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
          assignee_id TEXT,
          tag TEXT,
          story_points INTEGER,
          seq INTEGER,
          position INTEGER NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY(column_id) REFERENCES columns(id) ON DELETE CASCADE,
          FOREIGN KEY(assignee_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating tasks table:', err.message);
        });
        
        // Try to add seq column if it doesn't exist
        db.run('ALTER TABLE tasks ADD COLUMN seq INTEGER', (err) => {
          // Column might already exist, ignore error
        });

        db.run(`CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating comments table:', err.message);
        });

        // История изменений задач
        db.run(`CREATE TABLE IF NOT EXISTS task_history (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          user_id TEXT,
          action TEXT NOT NULL,
          payload TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating task_history table:', err.message);
        });

        // Seed admin if not exists
        db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com'], (err, admin) => {
          if (err) {
            console.error('Error checking admin user:', err.message);
            return;
          }
          
          if (!admin) {
            const { v4: uuidv4 } = require('uuid');
            const id = uuidv4();
            const password_hash = bcrypt.hashSync('admin123', 10);
            
            db.run('INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)',
              [id, 'admin@example.com', 'Admin', password_hash, 'admin'], (err) => {
                if (err) {
                  console.error('Error creating admin user:', err.message);
                }
              });
          }
        });

        // Seed demo project if none exists
        db.get('SELECT COUNT(1) AS c FROM projects', (err, row) => {
          if (err) {
            console.error('Error checking projects count:', err.message);
            return;
          }
          
          if (row.c === 0) {
            const { v4: uuidv4 } = require('uuid');
            const projectId = uuidv4();
            
            db.run('INSERT INTO projects (id, code, name) VALUES (?,?,?)',
              [projectId, 'DEMO', 'Demo Project'], (err) => {
                if (err) {
                  console.error('Error creating demo project:', err.message);
                  return;
                }
                
                // Link admin
                db.get('SELECT id FROM users WHERE email = ?', ['admin@example.com'], (err, admin) => {
                  if (admin) {
                    db.run('INSERT INTO project_users (project_id, user_id) VALUES (?,?)',
                      [projectId, admin.id], (err) => {
                        if (err) console.error('Error linking admin to project:', err.message);
                      });
                  }
                });
                
                // Create columns
                const colNames = ['К работе','В процессе','Кодревью','Тестирование','Готово'];
                colNames.forEach((name, i) => {
                  const colId = uuidv4();
                  db.run('INSERT INTO columns (id, project_id, name, position) VALUES (?,?,?,?)',
                    [colId, projectId, name, i], (err) => {
                      if (err) console.error('Error creating column:', err.message);
                    });
                });
                
                // Fix existing projects with wrong columns
                db.all('SELECT id FROM projects', (err, projects) => {
                  if (err) {
                    console.error('Error getting projects:', err.message);
                    return;
                  }
                  
                  projects.forEach(project => {
                    db.all('SELECT * FROM columns WHERE project_id = ?', [project.id], (err, columns) => {
                      if (err) {
                        console.error('Error getting columns:', err.message);
                        return;
                      }
                      
                      // Check if columns are wrong (car-related)
                      const hasWrongColumns = columns.some(col => 
                        col.name.includes('Cars') || 
                        col.name.includes('List of') ||
                        col.name.includes('American') ||
                        col.name.includes('German') ||
                        col.name.includes('Italian') ||
                        col.name.includes('Swedish') ||
                        col.name.includes('Japanese') ||
                        col.name.includes('Korean')
                      );
                      
                      if (hasWrongColumns) {
                        // Delete wrong columns
                        db.run('DELETE FROM columns WHERE project_id = ?', [project.id], (err) => {
                          if (err) {
                            console.error('Error deleting wrong columns:', err.message);
                            return;
                          }
                          
                          // Create correct columns
                          const correctColNames = ['К работе','В процессе','Кодревью','Тестирование','Готово'];
                          correctColNames.forEach((name, i) => {
                            const colId = uuidv4();
                            db.run('INSERT INTO columns (id, project_id, name, position) VALUES (?,?,?,?)',
                              [colId, project.id, name, i], (err) => {
                                if (err) console.error('Error creating correct column:', err.message);
                              });
                          });
                        });
                      }
                    });
                  });
                });
                
                // Create sample tasks
                db.get('SELECT id FROM columns WHERE project_id = ? ORDER BY position LIMIT 2', [projectId], (err, cols) => {
                  if (cols && cols.length >= 2) {
                    const { v4: uuidv4 } = require('uuid');
                    db.run(`INSERT INTO tasks (id, project_id, column_id, title, description, priority, assignee_id, tag, story_points, seq, position)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                      [uuidv4(), projectId, cols[0].id, 'Настроить проект', 'Инициализация репозитория', 'medium', admin?.id, 'setup', 3, 1, 0]);
                    
                    db.run(`INSERT INTO tasks (id, project_id, column_id, title, description, priority, assignee_id, tag, story_points, seq, position)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                      [uuidv4(), projectId, cols[0].id, 'Сделать логин', 'Форма входа и токены', 'high', admin?.id, 'auth', 5, 2, 1]);
                    
                    db.run(`INSERT INTO tasks (id, project_id, column_id, title, description, priority, assignee_id, tag, story_points, seq, position)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                      [uuidv4(), projectId, cols[1].id, 'DND доски', 'Перетаскивание задач', 'medium', admin?.id, 'board', 8, 3, 0]);
                    

                  }
                });
              });
          }
        });

        // Backfill seq for existing tasks without it
        db.all('SELECT id FROM projects', (err, projects) => {
          if (err) {
            console.error('Error getting projects:', err.message);
            return;
          }
          
          projects.forEach(p => {
            db.all('SELECT id FROM tasks WHERE project_id=? AND (seq IS NULL OR seq=0) ORDER BY position', [p.id], (err, list) => {
              if (err) {
                console.error('Error getting tasks for seq update:', err.message);
                return;
              }
              
              db.get('SELECT COALESCE(MAX(seq),0) as m FROM tasks WHERE project_id=?', [p.id], (err, row) => {
                if (err) {
                  console.error('Error getting max seq:', err.message);
                  return;
                }
                
                let counter = row.m;
                list.forEach(taskRow => {
                  counter += 1;
                  db.run('UPDATE tasks SET seq=? WHERE id=?', [counter, taskRow.id], (err) => {
                    if (err) console.error('Error updating task seq:', err.message);
                  });
                });
              });
            });
          });
        });

        // Ensure admin has access to all projects (fix for user ID migration)
        db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com'], (err, admin) => {
          if (err || !admin) {
            return;
          }
          
          db.all('SELECT * FROM projects', (err, projects) => {
            if (err) {
              console.error('Error getting projects for access fix:', err.message);
              return;
            }
            
            projects.forEach(project => {
              db.get('SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?', [project.id, admin.id], (err, access) => {
                if (err) {
                  console.error(`Error checking access for project ${project.name}:`, err.message);
                } else if (!access) {
                  db.run('INSERT INTO project_users (project_id, user_id) VALUES (?,?)', [project.id, admin.id], (err) => {
                    if (err) {
                      console.error(`Error adding access for project ${project.name}:`, err.message);
                    }
                  });
                }
              });
            });
          });
        });

        resolve();
      });
    });
  });
};

// Helper functions for database operations
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize database
init().catch(console.error);

module.exports = {
  db,
  dbGet,
  dbAll,
  dbRun
};
