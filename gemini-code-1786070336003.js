import { log, logError } from '../utils/logger.js';

export class ServerBuilder {
  static async syncServer(guild, serverConfig, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Application des paramètres globaux du serveur...`);

    const updates = {};
    if (serverConfig.nom && guild.name !== serverConfig.nom) updates.name = serverConfig.nom;
    if (serverConfig.verification_level !== undefined && guild.verificationLevel !== serverConfig.verification_level) {
      updates.verificationLevel = serverConfig.verification_level;
    }
    if (serverConfig.explicit_content_filter !== undefined && guild.explicitContentFilter !== serverConfig.explicit_content_filter) {
      updates.explicitContentFilter = serverConfig.explicit_content_filter;
    }
    if (serverConfig.icon && guild.iconURL() !== serverConfig.icon) updates.icon = serverConfig.icon;
    if (serverConfig.banner && guild.bannerURL() !== serverConfig.banner) updates.banner = serverConfig.banner;

    if (Object.keys(updates).length > 0) {
      if (!preview) {
        await guild.edit(updates);
        log('Réglaes du serveur mis à jour.');
      } else {
        log(`[Preview] Serveur à modifier: ${Object.keys(updates).join(', ')}`);
      }
      return { created: 0, updated: 1, deleted: 0 };
    }

    return { created: 0, updated: 0, deleted: 0 };
  }
}