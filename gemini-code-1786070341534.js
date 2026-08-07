import { ChannelType } from 'discord.js';
import { log, logError } from '../utils/logger.js';
import { PermissionBuilder } from './PermissionBuilder.js';

export class CategoryBuilder {
  static async syncCategories(guild, categoriesConfig, overwritesConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Synchronisation des catégories...`);
    const stats = { created: 0, updated: 0, deleted: 0 };
    const sortedCategories = [...categoriesConfig.categories].sort((a, b) => a.position - b.position);

    for (const cat of sortedCategories) {
      try {
        const cachedId = cache.categories[cat.id];
        let category = cachedId ? guild.channels.cache.get(cachedId) : guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === cat.nom);

        const permissionOverwrites = PermissionBuilder.buildOverwrites(guild, cat.id, overwritesConfig, cache.roles);

        const categoryData = {
          name: cat.nom,
          type: ChannelType.GuildCategory,
          position: cat.position,
          permissionOverwrites
        };

        if (category) {
          if (!preview) {
            category = await category.edit(categoryData);
          }
          cache.categories[cat.id] = category.id;
          stats.updated++;
          log(`Catégorie [${cat.nom}] : Mise à jour ${preview ? '(simulée)' : 'OK'}`);
        } else {
          if (!preview) {
            category = await guild.channels.create(categoryData);
            cache.categories[cat.id] = category.id;
          } else {
            cache.categories[cat.id] = `preview_cat_${cat.id}`;
          }
          stats.created++;
          log(`Catégorie [${cat.nom}] : Création ${preview ? '(simulée)' : 'OK'}`);
        }
      } catch (err) {
        logError(`Erreur sur la catégorie ${cat.nom}`, err);
      }
    }

    return stats;
  }
}