import fs from 'fs';
import path from 'path';
import { validateTemplateFolder } from '../utils/validator.js';
import { log } from '../utils/logger.js';

export function loadTemplateConfig(dirPath) {
  validateTemplateFolder(dirPath);

  const readJson = (file) => {
    const raw = fs.readFileSync(path.join(dirPath, file), 'utf-8');
    return JSON.parse(raw);
  };

  log('Chargement des configurations JSON...');

  return {
    server: readJson('server.json'),
    roles: readJson('roles.json'),
    categories: readJson('categories.json'),
    channels: readJson('channels.json'),
    overwrites: readJson('overwrites.json'),
    permissions: readJson('permissions.json'),
    emojis: readJson('emojis.json'),
    stickers: readJson('stickers.json'),
    webhooks: readJson('webhooks.json')
  };
}
