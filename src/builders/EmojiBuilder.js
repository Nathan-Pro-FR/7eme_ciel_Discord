import { log, logError } from '../utils/logger.js';

export class EmojiBuilder {
  static async syncEmojisAndStickers(guild, emojisConfig, stickersConfig) {
    log('Début de la création des emojis et stickers...');

    if (emojisConfig?.emojis) {
      for (const e of emojisConfig.emojis) {
        try {
          const exists = guild.emojis.cache.find(emoji => emoji.name === e.name);
          if (!exists && e.asset_url) {
            await guild.emojis.create({ attachment: e.asset_url, name: e.name });
            log(`Création Emoji : ${e.name} : OK`);
          }
        } catch (err) {
          logError(`Impossible de créer l'emoji ${e.name}`, err);
        }
      }
    }

    if (stickersConfig?.stickers) {
      for (const s of stickersConfig.stickers) {
        try {
          const exists = guild.stickers.cache.find(sticker => sticker.name === s.name);
          if (!exists && s.asset_url) {
            await guild.stickers.create({
              file: s.asset_url,
              name: s.name,
              tags: s.tags || 'celestial'
            });
            log(`Création Sticker : ${s.name} : OK`);
          }
        } catch (err) {
          logError(`Impossible de créer le sticker ${s.name}`, err);
        }
      }
    }
  }
}
