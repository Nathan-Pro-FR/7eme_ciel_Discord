import { PermissionFlagsBits } from 'discord.js';

const PERMISSION_MAP = {
  ViewChannel: PermissionFlagsBits.ViewChannel,
  VIEW_CHANNEL: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  SEND_MESSAGES: PermissionFlagsBits.SendMessages,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
  BanMembers: PermissionFlagsBits.BanMembers,
  BAN_MEMBERS: PermissionFlagsBits.BanMembers,
  KickMembers: PermissionFlagsBits.KickMembers,
  KICK_MEMBERS: PermissionFlagsBits.KickMembers,
  MentionEveryone: PermissionFlagsBits.MentionEveryone,
  MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
  AttachFiles: PermissionFlagsBits.AttachFiles,
  ATTACH_FILES: PermissionFlagsBits.AttachFiles,
  EmbedLinks: PermissionFlagsBits.EmbedLinks,
  EMBED_LINKS: PermissionFlagsBits.EmbedLinks,
  AddReactions: PermissionFlagsBits.AddReactions,
  ADD_REACTIONS: PermissionFlagsBits.AddReactions,
  UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
  USE_EXTERNAL_EMOJIS: PermissionFlagsBits.UseExternalEmojis,
  UseExternalStickers: PermissionFlagsBits.UseExternalStickers,
  USE_EXTERNAL_STICKERS: PermissionFlagsBits.UseExternalStickers,
  CreatePublicThreads: PermissionFlagsBits.CreatePublicThreads,
  CREATE_PUBLIC_THREADS: PermissionFlagsBits.CreatePublicThreads,
  CreatePrivateThreads: PermissionFlagsBits.CreatePrivateThreads,
  CREATE_PRIVATE_THREADS: PermissionFlagsBits.CreatePrivateThreads,
  ManageThreads: PermissionFlagsBits.ManageThreads,
  MANAGE_THREADS: PermissionFlagsBits.ManageThreads,
  ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
  MANAGE_WEBHOOKS: PermissionFlagsBits.ManageWebhooks,
  UseApplicationCommands: PermissionFlagsBits.UseApplicationCommands,
  USE_APPLICATION_COMMANDS: PermissionFlagsBits.UseApplicationCommands,
  Connect: PermissionFlagsBits.Connect,
  CONNECT: PermissionFlagsBits.Connect,
  Speak: PermissionFlagsBits.Speak,
  SPEAK: PermissionFlagsBits.Speak,
  Stream: PermissionFlagsBits.Stream,
  STREAM: PermissionFlagsBits.Stream,
  PrioritySpeaker: PermissionFlagsBits.PrioritySpeaker,
  PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,
  MuteMembers: PermissionFlagsBits.MuteMembers,
  MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  MOVE_MEMBERS: PermissionFlagsBits.MoveMembers,
  DeafenMembers: PermissionFlagsBits.DeafenMembers,
  DEAFEN_MEMBERS: PermissionFlagsBits.DeafenMembers,
  UseVAD: PermissionFlagsBits.UseVAD,
  USE_VAD: PermissionFlagsBits.UseVAD,
  Administrator: PermissionFlagsBits.Administrator,
  ADMINISTRATOR: PermissionFlagsBits.Administrator,
  ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
  READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory
};

export class PermissionBuilder {
  static parsePermissions(permList) {
    if (!Array.isArray(permList)) return 0n;
    return permList.reduce((acc, perm) => {
      const flag = PERMISSION_MAP[perm];
      return flag ? acc | flag : acc;
    }, 0n);
  }

  static buildOverwrites(guild, channelId, overwritesConfig, roleMap) {
    const channelOverwrites = overwritesConfig.overwrites?.find(o => o.channel_id === channelId);
    if (!channelOverwrites) return [];

    const result = [];

    if (channelOverwrites.role_overwrites) {
      for (const ro of channelOverwrites.role_overwrites) {
        const targetRoleId = ro.role_id === 'role_everyone' ? guild.roles.everyone.id : roleMap.get(ro.role_id);
        if (targetRoleId) {
          result.push({
            id: targetRoleId,
            allow: this.parsePermissions(ro.allow),
            deny: this.parsePermissions(ro.deny)
          });
        }
      }
    }

    if (channelOverwrites.member_overwrites) {
      for (const mo of channelOverwrites.member_overwrites) {
        result.push({
          id: mo.member_id,
          allow: this.parsePermissions(mo.allow),
          deny: this.parsePermissions(mo.deny)
        });
      }
    }

    return result;
  }
}
