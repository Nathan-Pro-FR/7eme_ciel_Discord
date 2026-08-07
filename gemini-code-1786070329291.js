import fs from 'fs';
import path from 'path';
import { log, logError } from './logger.js';

const DATA_DIR = path.resolve('data');
const DEPLOYED_FILE = path.join(DATA_DIR, 'deployed.json');
const BACKUP_FILE = path.join(DATA_DIR, 'deployed.backup.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class CacheManager {
  static getCache() {
    if (!fs.existsSync(DEPLOYED_FILE)) {
      return { lastDeployment: null, roles: {}, categories: {}, channels: {}, emojis: {}, stickers: {}, webhooks: {} };
    }
    try {
      return JSON.parse(fs.readFileSync(DEPLOYED_FILE, 'utf-8'));
    } catch (err) {
      logError('Erreur de lecture du cache deployed.json', err);
      return { lastDeployment: null, roles: {}, categories: {}, channels: {}, emojis: {}, stickers: {}, webhooks: {} };
    }
  }

  static saveCache(data) {
    data.lastDeployment = new Date().toISOString();
    fs.writeFileSync(DEPLOYED_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  static createBackup() {
    if (fs.existsSync(DEPLOYED_FILE)) {
      fs.copyFileSync(DEPLOYED_FILE, BACKUP_FILE);
      log('Sauvegarde de sécurité du cache créée (deployed.backup.json).');
    }
  }

  static restoreBackup() {
    if (!fs.existsSync(BACKUP_FILE)) {
      throw new Error('Aucune sauvegarde disponible pour effectuer le rollback.');
    }
    fs.copyFileSync(BACKUP_FILE, DEPLOYED_FILE);
    log('Restauration du cache effectuée à partir du backup.');
    return this.getCache();
  }
}