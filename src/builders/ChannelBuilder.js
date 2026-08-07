import { ChannelType, VideoQualityMode } from 'discord.js';
import { log, logError } from '../utils/logger.js';
import { PermissionBuilder } from './PermissionBuilder.js';

export class ChannelBuilder {
  static mapChannelType(typeNum) {
    switch (typeNum) {
      case 0: return ChannelType.GuildText;
      case 2: return ChannelType.GuildVoice;
      case 5: return ChannelType.GuildAnnouncement;
      case 15: return ChannelType.GuildForum;
      case 16: return ChannelType.GuildMedia;
      default: return ChannelType.GuildText;
    }
  }

  static async syncChannels(guild, channelsConfig, overwritesConfig, categoryMap, roleMap) {
    log('Début de la synchronisation des salons...');
    const channelMap = new Map();
    const sortedChannels = [...channelsConfig.channels].sort((a, b) => a.position - b.position);

    for (const ch of sortedChannels) {
      try {
        const type = this.mapChannelType(ch.type);
        const parentId = categoryMap.get(ch.categorie_id) || null;
        const permissionOverwrites = PermissionBuilder.buildOverwrites(guild, ch.id, overwritesConfig, roleMap);

        const channelData = {
          name: ch.nom,
          type,
          parent: parentId,
          position: ch.position,
          topic: ch.topic || undefined,
          nsfw: ch.NSFW ?? false,
          rateLimitPerUser: ch.slowmode || 0,
          permissionOverwrites
        };

        if (type === ChannelType.GuildVoice) {
          if (ch.bitrate) channelData.bitrate = ch.bitrate;
          if (ch.user_limit) channelData.userLimit = ch.user_limit;
          if (ch.video_quality) channelData.videoQualityMode = ch.video_quality === 1 ? VideoQualityMode.Auto : VideoQualityMode.Full;
        }

        let existingChannel = guild.channels.cache.find(c => c.name === ch.nom && c.parentId === parentId);

        if (existingChannel) {
          existingChannel = await existingChannel.edit(channelData);
          log(`Mise à jour salon ${ch.nom} : OK`);
        } else {
          existingChannel = await guild.channels.create(channelData);
          log(`Création salon ${ch.nom} : OK`);
        }

        channelMap.set(ch.id, existingChannel.id);
      } catch (err) {
        logError(`Erreur lors de la synchronisation du salon ${ch.nom}`, err);
      }
    }

    return channelMap;
  }
}
