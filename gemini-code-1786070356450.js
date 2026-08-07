import fs from 'fs';
import path from 'path';
import { log, logError } from './logger.js';

const SNAPSHOT_DIR = path.resolve('data/snapshots');

export class SnapshotManager {
  static async createSnapshot(guild) {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    log('Création d\'un snapshot de l\'état actuel du serveur Discord...');

    await guild.roles.fetch();
    await guild.channels.fetch();

    const snapshotData = {
      timestamp: new Date().toISOString(),
      guild: {
        name: guild.name,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        afkTimeout: guild.afkTimeout,
        afkChannelId: guild.afkChannelId,
        systemChannelId: guild.systemChannelId,
        rulesChannelId: guild.rulesChannelId
      },
      roles: guild.roles.cache.map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        managed: r.managed
      })),
      channels: guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        position: c.position,
        topic: c.topic || null,
        nsfw: c.nsfw || false,
        rateLimitPerUser: c.rateLimitPerUser || 0,
        bitrate: c.bitrate || null,
        userLimit: c.userLimit || null,
        permissionOverwrites: c.permissionOverwrites.cache.map(o => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString()
        }))
      }))
    };

    const fileName = `snapshot_${Date.now()}.json`;
    const filePath = path.join(SNAPSHOT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(snapshotData, null, 2), 'utf-8');
    fs.writeFileSync(path.join(SNAPSHOT_DIR, 'latest.json'), JSON.stringify(snapshotData, null, 2), 'utf-8');

    log(`Snapshot sauvegardé : ${fileName}`);
    return filePath;
  }

  static async restoreSnapshot(guild) {
    const latestPath = path.join(SNAPSHOT_DIR, 'latest.json');
    if (!fs.existsSync(latestPath)) {
      throw new Error('Aucun snapshot trouvé dans data/snapshots/latest.json pour exécuter la restauration.');
    }

    log('Restauration réelle du serveur depuis le dernier snapshot...');
    const snapshot = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

    // 1. Paramètres serveur
    await guild.edit({
      name: snapshot.guild.name,
      verificationLevel: snapshot.guild.verificationLevel,
      explicitContentFilter: snapshot.guild.explicitContentFilter,
      afkTimeout: snapshot.guild.afkTimeout
    }).catch(err => logError('Erreur restauration paramètres serveur', err));

    // 2. Rôles (mise à jour/création)
    for (const rData of snapshot.roles) {
      if (rData.managed || rData.name === '@everyone') continue;
      let role = guild.roles.cache.get(rData.id) || guild.roles.cache.find(r => r.name === rData.name);
      if (role) {
        await role.edit({
          name: rData.name,
          color: rData.color,
          hoist: rData.hoist,
          permissions: BigInt(rData.permissions),
          mentionable: rData.mentionable
        }).catch(() => {});
      }
    }

    // 3. Salons
    for (const cData of snapshot.channels) {
      let channel = guild.channels.cache.get(cData.id);
      if (channel) {
        await channel.edit({
          name: cData.name,
          topic: cData.topic,
          nsfw: cData.nsfw,
          rateLimitPerUser: cData.rateLimitPerUser,
          bitrate: cData.bitrate || undefined,
          userLimit: cData.userLimit || undefined
        }).catch(() => {});
      }
    }

    log('Restauration Discord terminée.');
  }
}