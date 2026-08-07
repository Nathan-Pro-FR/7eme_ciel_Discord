import { log, logError } from '../utils/logger.js';

export class EmojiBuilder {
  static async syncEmojisAndStickers(guild, emojisConfig, stickersConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Synchronisation des emojis et stickers...`);
    const stats = { created: 0, updated: 0, deleted: 0 };

    if (emojisConfig?.emojis) {
      for (const e of emojisConfig.emojis) {
        try {
          const cachedId = cache.emojis[e.id];
          let emoji = cachedId ? guild.emojis.cache.get(cachedId) : guild.emojis.cache.find(em => em.name === e.name);

          if (!emoji && e.asset_url) {
            if (!preview) {
              emoji = await guild.emojis.create({ attachment: e.asset_url, name: e.name });
              cache.emojis[e.id] = emoji.id;
            } else {
              cache.emojis[e.id] = `preview_emoji_${e.id}`;
            }
            stats.created++;
            log(`Emoji [${e.name}] : Création ${preview ? '(simulée)' : 'OK'}`);
          } else if (emoji) {
            cache.emojis[e.id] = emoji.id;
            stats.updated++;
          }
        } catch (err) {
          logError(`Erreur sur l'emoji ${e.name}`, err);
        }
      }
    }

    if (stickersConfig?.stickers) {
      for (const s of stickersConfig.stickers) {
        try {
          const cachedId = cache.stickers?.[s.id];
          let sticker = cachedId ? guild.stickers.cache.get(cachedId) : guild.stickers.cache.find(st => st.name === s.name);

          if (!sticker && s.asset_url) {
            if (!preview) {
              sticker = await guild.stickers.create({
                file: s.asset_url,
                name: s.name,
                tags: s.tags || 'celestial'
              });
              if (!cache.stickers) cache.stickers = {};
              cache.stickers[s.id] = sticker.id;
            }
            stats.created++;
            log(`Sticker [${s.name}] : Création ${preview ? '(simulée)' : 'OK'}`);
          } else if (sticker) {
            if (!cache.stickers) cache.stickers = {};
            cache.stickers[s.id] = sticker.id;
            stats.updated++;
          }
        } catch (err) {
          logError(`Erreur sur le sticker ${s.name}`, err);
        }
      }
    }

    return stats;
  }
}