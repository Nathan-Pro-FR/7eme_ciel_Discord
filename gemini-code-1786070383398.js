import fs from 'fs';
import path from 'path';
import { ChannelType } from 'discord.js';

export class Exporter {
  static async exportFullTemplate(guild, outputDir = 'exported-template-v4') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await guild.roles.fetch();
    await guild.channels.fetch();

    const writeJson = (filename, data) => {
      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify({ schemaVersion: "1.0.0", ...data }, null, 2), 'utf-8');
    };

    writeJson('server.json', {
      nom: guild.name,
      verification_level: guild.verificationLevel,
      explicit_content_filter: guild.explicitContentFilter,
      afk_timeout: guild.afkTimeout,
      icon: guild.iconURL() || null,
      banner: guild.bannerURL() || null
    });

    writeJson('roles.json', {
      roles: guild.roles.cache.filter(r => !r.managed).map(r => ({
        id: `role_${r.id}`,
        nom: r.name,
        couleur: r.hexColor,
        position: r.position,
        permissions: r.permissions.toArray(),
        mentionnable: r.mentionnable,
        affiche_separement: r.hoist
      }))
    });

    writeJson('categories.json', {
      categories: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(c => ({
        id: `cat_${c.id}`,
        nom: c.name,
        position: c.position
      }))
    });

    writeJson('channels.json', {
      channels: guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).map(c => ({
        id: `chan_${c.id}`,
        nom: c.name,
        type: c.type,
        categorie_id: c.parentId ? `cat_${c.parentId}` : null,
        position: c.position,
        topic: c.topic || undefined,
        slowmode: c.rateLimitPerUser || 0
      }))
    });

    const forumsData = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum || c.type === ChannelType.GuildMedia).map(c => ({
      id: `chan_${c.id}`,
      nom: c.name,
      available_tags: c.availableTags,
      default_reaction_emoji: c.defaultReactionEmoji
    }));
    writeJson('forums.json', { forums: forumsData });

    const overwritesData = guild.channels.cache.map(c => ({
      channel_id: `chan_${c.id}`,
      role_overwrites: c.permissionOverwrites.cache.map(o => ({
        role_id: `role_${o.id}`,
        allow: o.allow.toArray(),
        deny: o.deny.toArray()
      }))
    }));
    writeJson('overwrites.json', { overwrites: overwritesData });

    writeJson('emojis.json', { emojis: guild.emojis.cache.map(e => ({ id: `emoji_${e.id}`, name: e.name, asset_url: e.url })) });
    writeJson('stickers.json', { stickers: guild.stickers.cache.map(s => ({ id: `sticker_${s.id}`, name: s.name, asset_url: s.url })) });

    return outputDir;
  }
}