import { log, logError } from '../utils/logger.js';
import { PermissionBuilder } from './PermissionBuilder.js';

export class RoleBuilder {
  static async syncRoles(guild, rolesConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Synchronisation des rôles...`);
    const stats = { created: 0, updated: 0, deleted: 0 };
    const sortedRoles = [...rolesConfig.roles].sort((a, b) => a.position - b.position);

    for (const r of sortedRoles) {
      if (r.nom === '@everyone' || r.id === 'role_everyone') {
        const everyonePerms = PermissionBuilder.parsePermissions(r.permissions);
        if (!preview) {
          await guild.roles.everyone.setPermissions(everyonePerms);
        }
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
          if (!preview) {
            role = await role.edit(roleData);
          }
          cache.roles[r.id] = role.id;
          stats.updated++;
          log(`Rôle [${r.nom}] : Mise à jour ${preview ? '(simulée)' : 'OK'}`);
        } else {
          if (!preview) {
            role = await guild.roles.create(roleData);
            cache.roles[r.id] = role.id;
          } else {
            cache.roles[r.id] = `preview_id_${r.id}`;
          }
          stats.created++;
          log(`Rôle [${r.nom}] : Création ${preview ? '(simulée)' : 'OK'}`);
        }
      } catch (err) {
        logError(`Erreur sur le rôle ${r.nom}`, err);
      }
    }

    return stats;
  }
}