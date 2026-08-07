import { log } from '../utils/logger.js';
import { AssetResolver } from '../utils/assetResolver.js';

export class ServerBuilder {
  static async syncServer(guild, serverConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Configuration complète du serveur...`);

    const updates = {};
    if (serverConfig.nom && guild.name !== serverConfig.nom) updates.name = serverConfig.nom;
    if (serverConfig.verification_level !== undefined) updates.verificationLevel = serverConfig.verification_level;
    if (serverConfig.explicit_content_filter !== undefined) updates.explicitContentFilter = serverConfig.explicit_content_filter;
    if (serverConfig.afk_timeout !== undefined) updates.afkTimeout = serverConfig.afk_timeout;

    const iconPath = AssetResolver.resolve(serverConfig.icon);
    if (iconPath) updates.icon = iconPath;

    const bannerPath = AssetResolver.resolve(serverConfig.banner);
    if (bannerPath) updates.banner = bannerPath;

    if (serverConfig.afk_channel_id && cache.channels[serverConfig.afk_channel_id]) {
      updates.afkChannel = cache.channels[serverConfig.afk_channel_id];
    }
    if (serverConfig.system_channel_id && cache.channels[serverConfig.system_channel_id]) {
      updates.systemChannel = cache.channels[serverConfig.system_channel_id];
    }
    if (serverConfig.rules_channel_id && cache.channels[serverConfig.rules_channel_id]) {
      updates.rulesChannel = cache.channels[serverConfig.rules_channel_id];
    }

    if (Object.keys(updates).length > 0 && !preview) {
      await guild.edit(updates);
      log('Paramètres système du serveur appliqués avec succès.');
    }

    return { created: 0, updated: Object.keys(updates).length > 0 ? 1 : 0, deleted: 0 };
  }
}