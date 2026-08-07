import { log, logError } from '../utils/logger.js';
import { PermissionBuilder } from './PermissionBuilder.js';

export class RoleBuilder {
  static async syncRoles(guild, rolesConfig) {
    log('Début de la création/synchronisation des rôles...');
    const roleMap = new Map();
    const sortedRoles = [...rolesConfig.roles].sort((a, b) => a.position - b.position);

    for (const r of sortedRoles) {
      if (r.nom === '@everyone' || r.id === 'role_everyone') {
        const everyonePerms = PermissionBuilder.parsePermissions(r.permissions);
        await guild.roles.everyone.setPermissions(everyonePerms);
        roleMap.set('role_everyone', guild.roles.everyone.id);
        log('Mise à jour du rôle @everyone : OK');
        continue;
      }

      try {
        let existingRole = guild.roles.cache.find(role => role.name === r.nom);
        const roleData = {
          name: r.nom,
          color: r.couleur,
          hoist: r.affiche_separement ?? false,
          mentionable: r.mentionnable ?? false,
          permissions: PermissionBuilder.parsePermissions(r.permissions)
        };

        if (existingRole) {
          existingRole = await existingRole.edit(roleData);
          log(`Mise à jour rôle ${r.nom} : OK`);
        } else {
          existingRole = await guild.roles.create(roleData);
          log(`Création rôle ${r.nom} : OK`);
        }

        roleMap.set(r.id, existingRole.id);
      } catch (err) {
        logError(`Erreur lors de la création/édition du rôle ${r.nom}`, err);
      }
    }

    return roleMap;
  }
}
