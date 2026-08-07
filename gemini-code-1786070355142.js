import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.resolve('data/deployment.lock');

export class LockManager {
  static acquire() {
    if (fs.existsSync(LOCK_FILE)) {
      const time = fs.readFileSync(LOCK_FILE, 'utf-8');
      throw new Error(`Un déploiement est déjà en cours depuis ${time}. Veuillez patienter.`);
    }
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    fs.writeFileSync(LOCK_FILE, new Date().toISOString(), 'utf-8');
  }

  static release() {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  }
}