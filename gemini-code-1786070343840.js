import { ChannelType, VideoQualityMode, SortOrderType, ForumLayoutType } from 'discord.js';
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

  static async syncChannels(guild, channelsConfig, overwritesConfig, cache, preview = false) {
    log(`[${preview ? 'SIMULATION' : 'EXEC'}] Synchronisation avancée des salons...`);
    const stats = { created: 0, updated: 0, deleted: 0 };
    const sortedChannels = [...channelsConfig.channels].sort((a, b) => a.position - b.position);

    for (const ch of sortedChannels) {
      try {
        const type = this.mapChannelType(ch.type);
        const parentId = cache.categories[ch.categorie_id] || null;
        const cachedId = cache.channels[ch.id];

        let channel = cachedId ? guild.channels.cache.get(cachedId) : guild.channels.cache.find(c => c.name === ch.nom && c.parentId === parentId);

        const permissionOverwrites = PermissionBuilder.buildOverwrites(guild, ch.id, overwritesConfig, cache.roles);

        const channelData = {
          name: ch.nom,
          type,
          parent: parentId && !parentId.startsWith('preview_') ? parentId : undefined,
          position: ch.position,
          topic: ch.topic || undefined,
          nsfw: ch.NSFW ?? false,
          rateLimitPerUser: ch.slowmode || 0,
          permissionOverwrites
        };

        if (type === ChannelType.GuildVoice) {
          if (ch.bitrate) channelData.bitrate = ch.bitrate;
          if (ch.user_limit !== undefined) channelData.userLimit = ch.user_limit;
          if (ch.video_quality) channelData.videoQualityMode = ch.video_quality === 1 ? VideoQualityMode.Auto : VideoQualityMode.Full;
          if (ch.rtc_region) channelData.rtcRegion = ch.rtc_region;
        }

        if (type === ChannelType.GuildForum || type === ChannelType.GuildMedia) {
          if (ch.forum?.available_tags) {
            channelData.availableTags = ch.forum.available_tags.map(t => ({
              name: t.name,
              moderated: t.moderated,
              emoji: { name: t.emoji_name }
            }));
          }
          if (ch.forum?.default_sort_order !== undefined) {
            channelData.defaultSortOrder = ch.forum.default_sort_order === 0 ? SortOrderType.LatestActivity : SortOrderType.CreationDate;
          }
          if (ch.forum?.default_forum_layout !== undefined) {
            channelData.defaultForumLayout = ch.forum.default_forum_layout === 1 ? ForumLayoutType.ListView : ForumLayoutType.GalleryView;
          }
          if (ch.forum?.default_reaction_emoji) {
            channelData.defaultReactionEmoji = { name: ch.forum.default_reaction_emoji.emoji_name };
          }
        }

        if (channel) {
          if (!preview) {
            channel = await channel.edit(channelData);
            if (ch.sync_permissions_with_category && channel.parent) {
              await channel.lockPermissions();
            }
          }
          cache.channels[ch.id] = channel.id;
          stats.updated++;
          log(`Salon [${ch.nom}] : Mise à jour ${preview ? '(simulée)' : 'OK'}`);
        } else {
          if (!preview) {
            channel = await guild.channels.create(channelData);
            if (ch.sync_permissions_with_category && channel.parent) {
              await channel.lockPermissions();
            }
            cache.channels[ch.id] = channel.id;
          } else {
            cache.channels[ch.id] = `preview_chan_${ch.id}`;
          }
          stats.created++;
          log(`Salon [${ch.nom}] : Création ${preview ? '(simulée)' : 'OK'}`);
        }
      } catch (err) {
        logError(`Erreur sur le salon ${ch.nom}`, err);
      }
    }

    return stats;
  }
}