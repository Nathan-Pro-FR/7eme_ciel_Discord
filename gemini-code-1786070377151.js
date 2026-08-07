import fs from 'fs';
import path from 'path';
import { log, logError } from './logger.js';
import { ChannelType } from 'discord.js';

const SNAPSHOT_DIR = path.resolve('data/snapshots');

export class SnapshotManager {
  static async createFullSnapshot(guild, cache) {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    log('📷 Création du Snapshot V4 Intégral du serveur Discord...');

    await guild.roles.fetch();
    await guild.channels.fetch();

    const snapshotData = {
      timestamp: new Date().toISOString(),
      cache: JSON.parse(JSON.stringify(cache)),
      guild: {
        name: guild.name,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        afkTimeout: guild.afkTimeout,
        afkChannelId: guild.afkChannelId,
        systemChannelId: guild.systemChannelId,
        rulesChannelId: guild.rulesChannelId,
        publicUpdatesChannelId: guild.publicUpdatesChannelId
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
      channels: guild.channels.cache.map(c => {
        const base = {
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
          topic: c.topic || null,
          nsfw: c.nsfw || false,
          rateLimitPerUser: c.rateLimitPerUser || 0,
          permissionOverwrites: c.permissionOverwrites.cache.map(o => ({
            id: o.id,
            type: o.type,
            allow: o.allow.bitfield.toString(),
            deny: o.deny.bitfield.toString()
          }))
        };

        if (c.type === ChannelType.GuildVoice) {
          base.bitrate = c.bitrate;
          base.userLimit = c.userLimit;
          base.rtcRegion = c.rtcRegion;
          base.videoQualityMode = c.videoQualityMode;
        }

        if (c.type === ChannelType.GuildForum || c.type === ChannelType.GuildMedia) {
          base.availableTags = c.availableTags;
          base.defaultReactionEmoji = c.defaultReactionEmoji;
          base.defaultSortOrder = c.defaultSortOrder;
          base.defaultForumLayout = c.defaultForumLayout;
          base.defaultAutoArchiveDuration = c.defaultAutoArchiveDuration;
        }

        return base;
      })
    };

    const fileName = `snapshot_v4_${Date.now()}.json`;
    const filePath = path.join(SNAPSHOT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(snapshotData, null, 2), 'utf-8');
    fs.writeFileSync(path.join(SNAPSHOT_DIR, 'latest.json'), JSON.stringify(snapshotData, null, 2), 'utf-8');

    log(`✅ Snapshot V4 sauvegardé avec succès : ${fileName}`);
    return snapshotData;
  }

  static async performFullRollback(guild) {
    const latestPath = path.join(SNAPSHOT_DIR, 'latest.json');
    if (!fs.existsSync(latestPath)) {
      throw new Error('Aucun snapshot disponible pour la restauration.');
    }

    log('🔄 Démarrage du Vrai Rollback V4...');
    const snapshot = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

    // 1. Suppression des éléments créés après le snapshot
    await guild.channels.fetch();
    const snapChannelIds = new Set(snapshot.channels.map(c => c.id));
    for (const [id, ch] of guild.channels.cache) {
      if (!snapChannelIds.has(id)) {
        await ch.delete('Rollback V4: élément créé après snapshot').catch(() => {});
      }
    }

    await guild.roles.fetch();
    const snapRoleIds = new Set(snapshot.roles.map(r => r.id));
    for (const [id, rl] of guild.roles.cache) {
      if (!snapRoleIds.has(id) && !rl.managed && rl.id !== guild.roles.everyone.id) {
        await rl.delete('Rollback V4: rôle créé après snapshot').catch(() => {});
      }
    }

    // 2. Re-création/Restauration des Catégories puis des Salons
    const categoriesToRestore = snapshot.channels.filter(c => c.type === ChannelType.GuildCategory);
    for (const catData of categoriesToRestore) {
      let cat = guild.channels.cache.get(catData.id);
      if (!cat) {
        cat = await guild.channels.create({
          name: catData.name,
          type: ChannelType.GuildCategory,
          position: catData.position
        });
      }
    }

    const nonCategoryChannels = snapshot.channels.filter(c => c.type !== ChannelType.GuildCategory);
    for (const chData of nonCategoryChannels) {
      let ch = guild.channels.cache.get(chData.id);
      if (!ch) {
        ch = await guild.channels.create({
          name: chData.name,
          type: chData.type,
          parent: chData.parentId || undefined,
          position: chData.position,
          topic: chData.topic || undefined,
          nsfw: chData.nsfw,
          rateLimitPerUser: chData.rateLimitPerUser
        });
      }
    }

    // 3. Restauration des paramètres serveur
    await guild.edit({
      name: snapshot.guild.name,
      verificationLevel: snapshot.guild.verificationLevel,
      explicitContentFilter: snapshot.guild.explicitContentFilter,
      afkTimeout: snapshot.guild.afkTimeout
    }).catch(() => {});

    log('✅ Rollback V4 exécuté intégralement.');
    return snapshot.cache;
  }
}