import { ChannelType } from 'discord.js';
import { log, logError } from '../utils/logger.js';

export class CategoryBuilder {
  static async syncCategories(guild, categoriesConfig) {
    log('Début de la synchronisation des catégories...');
    const categoryMap = new Map();
    const sortedCategories = [...categoriesConfig.categories].sort((a, b) => a.position - b.position);

    for (const cat of sortedCategories) {
      try {
        let existingCat = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === cat.nom
        );

        if (existingCat) {
          existingCat = await existingCat.edit({ position: cat.position });
          log(`Mise à jour catégorie ${cat.nom} : OK`);
        } else {
          existingCat = await guild.channels.create({
            name: cat.nom,
            type: ChannelType.GuildCategory,
            position: cat.position
          });
          log(`Création catégorie ${cat.nom} : OK`);
        }

        categoryMap.set(cat.id, existingCat.id);
      } catch (err) {
        logError(`Erreur lors de la création de la catégorie ${cat.nom}`, err);
      }
    }

    return categoryMap;
  }
}
