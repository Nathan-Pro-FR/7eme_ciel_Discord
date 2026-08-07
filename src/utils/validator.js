import fs from 'fs';
import path from 'path';
import { log, logError } from './logger.js';

const REQUIRED_FILES = [
  'server.json',
  'roles.json',
  'categories.json',
  'channels.json',
  'overwrites.json',
  'permissions.json',
  'emojis.json',
  'stickers.json',
  'webhooks.json'
];

export function validateTemplateFolder(dirPath) {
  log(`Vérification du dossier template: ${dirPath}...`);
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Le dossier template ${dirPath} n'existe pas.`);
  }

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(dirPath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier manquant dans le template: ${file}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      JSON.parse(content);
    } catch (err) {
      throw new Error(`Le fichier ${file} n'est pas un JSON valide: ${err.message}`);
    }
  }

  log('Validation des fichiers JSON effectuée avec succès.');
  return true;
}
