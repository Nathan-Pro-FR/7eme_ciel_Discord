import { log, logError } from '../utils/logger.js';
import { PermissionBuilder } from './PermissionBuilder.js';

export class RoleBuilder {
  static async syncRoles(guild, rolesConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Synchronisation et positionnement des rôles...`);
    const stats = { created: 0, updated: 0, deleted: 0 };
    const botMember = await guild.members.fetchMe();
    const botHighestRole = botMember.roles.highest;

    const sortedRoles = [...rolesConfig.roles].sort((a, b) => a.position - b.position);

    for (const r of sortedRoles) {
      if (r.nom === '@everyone' || r.id === 'role_everyone') {
        const everyonePerms = PermissionBuilder.parsePermissions(r.permissions);
        if (!preview) await guild.roles.everyone.setPermissions(everyonePerms);
        cache.roles[r.id] = guild.roles.everyone.id;
        stats.updated++;
        continue;
      }

      try {
        const cachedId = cache.roles[r.id];
        let role = cachedId ? guild.roles.cache.get(cachedId) : guild.roles.cache.find(rl => rl.name === r.nom);

        const roleData = {
          name: r.nom,
          color: r.couleur,
          hoist: r.affiche_separement ?? false,
          mentionable: r.mentionnable ?? false,
          permissions: PermissionBuilder.parsePermissions(r.permissions)
        };

        if (role) {
          if (role.position >= botHighestRole.position) {
            log(`[Saut] Impossible de modifier le rôle ${r.nom} : supérieur ou égal au rôle du bot.`, 'WARN');
            cache.roles[r.id] = role.id;
            continue;
          }
          if (!preview) role = await role.edit(roleData);
          cache.roles[r.id] = role.id;
          stats.updated++;
        } else {
          if (!preview) {
            role = await guild.roles.create(roleData);
            cache.roles[r.id] = role.id;
          } else {
            cache.roles[r.id] = `preview_${r.id}`;
          }
          stats.created++;
        }
      } catch (err) {
        logError(`Erreur gestion rôle ${r.nom}`, err);
      }
    }

    // Réordonnancement global sécurisé des positions
    if (!preview) {
      const positionPayload = [];
      for (const r of sortedRoles) {
        const roleId = cache.roles[r.id];
        const role = guild.roles.cache.get(roleId);
        if (role && role.position < botHighestRole.position && !role.managed) {
          positionPayload.push({ role: role.id, position: r.position });
        }
      }
      if (positionPayload.length > 0) {
        await guild.roles.setPositions(positionPayload).catch(err => logError('Erreur positionnement hiérarchique des rôles', err));
      }
    }

    return stats;
  }
}