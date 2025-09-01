const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');
const { NotFoundError, ConflictError } = require('./errors');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  // Initialize database connection
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err.message);
          reject(err);
          return;
        }

        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        logger.info('Connected to SQLite database');
        resolve();
      });
    });
  }

  // Close database connection
  async close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err.message);
          reject(err);
          return;
        }
        
        logger.info('Database connection closed');
        resolve();
      });
    });
  }

  // Execute a query that returns a single row
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err.message, 'SQL:', sql, 'Params:', params);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Execute a query that returns multiple rows
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error:', err.message, 'SQL:', sql, 'Params:', params);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Execute a query that doesn't return data
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err.message, 'SQL:', sql, 'Params:', params);
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        let hasError = false;

        queries.forEach(({ sql, params = [] }) => {
          this.db.run(sql, params, function(err) {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              logger.error('Transaction error:', err.message);
              reject(err);
              return;
            }
            
            completed++;
            if (completed === queries.length && !hasError) {
              this.db.run('COMMIT');
              resolve();
            }
          });
        });
      });
    });
  }

  // Check if a record exists
  async exists(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const sql = `SELECT 1 FROM ${table} WHERE ${whereClause}`;
    const params = Object.values(conditions);
    
    const result = await this.get(sql, params);
    return !!result;
  }

  // Find a record by ID or throw NotFoundError
  async findById(table, id, select = '*') {
    const sql = `SELECT ${select} FROM ${table} WHERE id = ?`;
    const row = await this.get(sql, [id]);
    
    if (!row) {
      throw new NotFoundError(`${table} with id ${id} not found`);
    }
    
    return row;
  }

  // Create a new record
  async create(table, data) {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const result = await this.run(sql, Object.values(data));
    return { id: result.lastID, ...data };
  }

  // Update a record
  async update(table, id, data) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const params = [...Object.values(data), id];
    
    const result = await this.run(sql, params);
    
    if (result.changes === 0) {
      throw new NotFoundError(`${table} with id ${id} not found`);
    }
    
    return { id, ...data };
  }

  // Delete a record
  async delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await this.run(sql, [id]);
    
    if (result.changes === 0) {
      throw new NotFoundError(`${table} with id ${id} not found`);
    }
    
    return { id };
  }

  // Count records
  async count(table, conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    let params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
      params = Object.values(conditions);
    }
    
    const result = await this.get(sql, params);
    return result.count;
  }
}

// Create and export database instance
const dbPath = path.join(__dirname, '../app.db');
const database = new Database(dbPath);

module.exports = database;

