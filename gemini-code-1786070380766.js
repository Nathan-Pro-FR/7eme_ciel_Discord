import { MetadataManager } from './metadataManager.js';

export class DiffEngine {
  static compare(guild, config, cache) {
    const diff = {
      missingCategories: [],
      missingChannels: [],
      missingRoles: [],
      alteredRoles: [],
      alteredChannels: [],
      extraChannels: [],
      extraRoles: []
    };

    // Rôles
    const activeRolesByLogicalId = new Map();
    for (const [logicalId, discordId] of Object.entries(cache.roles || {})) {
      const role = guild.roles.cache.get(discordId);
      if (role) activeRolesByLogicalId.set(logicalId, role);
    }

    for (const targetRole of config.roles.roles) {
      const role = activeRolesByLogicalId.get(targetRole.id);
      if (!role) {
        diff.missingRoles.push(targetRole.nom);
      } else if (role.name !== targetRole.nom || role.hexColor.toUpperCase() !== targetRole.couleur.toUpperCase()) {
        diff.alteredRoles.push(`${targetRole.nom} (Nom/Couleur diverge)`);
      }
    }

    // Catégories
    const activeCategoriesByLogicalId = new Map();
    for (const [logicalId, discordId] of Object.entries(cache.categories || {})) {
      const cat = guild.channels.cache.get(discordId);
      if (cat) activeCategoriesByLogicalId.set(logicalId, cat);
    }

    for (const targetCat of config.categories.categories) {
      if (!activeCategoriesByLogicalId.has(targetCat.id)) {
        diff.missingCategories.push(targetCat.nom);
      }
    }

    // Salons
    const activeChannelsByLogicalId = new Map();
    for (const [logicalId, discordId] of Object.entries(cache.channels || {})) {
      const ch = guild.channels.cache.get(discordId);
      if (ch) activeChannelsByLogicalId.set(logicalId, ch);
    }

    for (const targetCh of config.channels.channels) {
      const ch = activeChannelsByLogicalId.get(targetCh.id);
      if (!ch) {
        diff.missingChannels.push(targetCh.nom);
      } else if (ch.name !== targetCh.nom) {
        diff.alteredChannels.push(`${targetCh.nom} -> ${ch.name}`);
      }
    }

    // Détection des éléments orphelins ou gérés par le bot mais retirés des JSON
    for (const [discordId, ch] of guild.channels.cache) {
      if (MetadataManager.isManagedByBot(ch) && !Object.values(cache.channels).includes(discordId) && !Object.values(cache.categories).includes(discordId)) {
        diff.extraChannels.push(ch.name);
      }
    }

    return diff;
  }
}