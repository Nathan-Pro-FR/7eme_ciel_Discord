import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('logs');
const LOG_FILE = path.join(LOG_DIR, 'deploy.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;

  console.log(`[${type}] ${message}`);
  fs.appendFileSync(LOG_FILE, logEntry, 'utf-8');
}

export function logError(message, error) {
  const errDetails = error?.stack || error?.message || error;
  log(`${message} | Error: ${errDetails}`, 'ERROR');
}

