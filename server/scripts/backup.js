#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'tasks.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
const MAX_BACKUPS = 30;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = path.join(BACKUP_DIR, `tasks-${timestamp}.db`);

try {
  const db = new Database(DB_PATH, { readonly: true });
  db.backup(backupPath).then(() => {
    db.close();
    console.log(`Backup created: ${backupPath}`);

    // Cleanup old backups (keep only MAX_BACKUPS most recent)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('tasks-') && f.endsWith('.db'))
      .sort()
      .reverse();

    for (const file of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      console.log(`Removed old backup: ${file}`);
    }
  }).catch(err => {
    db.close();
    console.error('Backup failed:', err.message);
    process.exit(1);
  });
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
}
