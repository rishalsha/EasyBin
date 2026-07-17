const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '.data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'easybin.db');
const db = new sqlite3.Database(dbPath);

// Initialize DB schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bins (
      code TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function getBin(code) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bins WHERE code = ?', [code.toLowerCase()], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createBin(code, content) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO bins (code, content) VALUES (?, ?)',
      [code.toLowerCase(), content],
      function (err) {
        if (err) reject(err);
        else resolve({ code: code.toLowerCase(), content });
      }
    );
  });
}

function updateBin(code, content) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE bins SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?',
      [content, code.toLowerCase()],
      function (err) {
        if (err) reject(err);
        else resolve({ code: code.toLowerCase(), content });
      }
    );
  });
}

module.exports = {
  getBin,
  createBin,
  updateBin
};
