import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { loadTemplateConfig } from '../config/loader.js';
import { CacheManager } from '../utils/cacheManager.js';
import { LockManager } from '../utils/lockManager.js';
import { SnapshotManager } from '../utils/snapshotManager.js';
import { Exporter } from '../utils/exporter.js';

import { ServerBuilder } from '../builders/ServerBuilder.js';
import { RoleBuilder } from '../builders/RoleBuilder.js';
import { CategoryBuilder } from '../builders/CategoryBuilder.js';
import { ChannelBuilder } from '../builders/ChannelBuilder.js';
import { EmojiBuilder } from '../builders/EmojiBuilder.js';
import { log, logError, OperationTimer } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Gestionnaire du déploiement IaC du 7ème Ciel (V3 Production)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('deploy').setDescription('Déploie le serveur complet.'))
  .addSubcommand(s => s.setName('update').setDescription('Synchronise la configuration.'))
  .addSubcommand(s => s.setName('preview').setDescription('Simule les modifications.'))
  .addSubcommand(s => s.setName('rollback').setDescription('Restaure le serveur selon le dernier snapshot Discord.'))
  .addSubcommand(s => s.setName('export').setDescription('Exporte la structure actuelle en JSON.'))
  .addSubcommand(s =>
    s.setName('reset')
     .setDescription('Supprime les éléments créés.')
     .addBooleanOption(o => o.setName('confirm').setDescription('Confirmer la suppression').setRequired(true))
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Accès refusé : Administrateur requis.', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const templatePath = process.env.TEMPLATE_DIR || './discord-template';

  await interaction.deferReply();

  if (subcommand === 'export') {
    try {
      const dir = await Exporter.exportGuildTemplate(interaction.guild);
      return interaction.editReply(`✅ **Exportation réussie !** Les fichiers JSON ont été sauvegardés dans le dossier \`${dir}\`.`);
    } catch (err) {
      return interaction.editReply(`❌ Erreur lors de l'exportation : ${err.message}`);
    }
  }

  if (subcommand === 'reset') {
    const confirmed = interaction.options.getBoolean('confirm');
    if (!confirmed) {
      return interaction.editReply('⚠️ **Action annulée.** L\'option `confirm: true` est requise.');
    }

    const cache = CacheManager.getCache();
    const countChannels = Object.keys(cache.channels || {}).length;
    const countRoles = Object.keys(cache.roles || {}).length;

    LockManager.acquire();
    try {
      await SnapshotManager.createSnapshot(interaction.guild);

      for (const id of Object.values(cache.channels)) {
        const ch = interaction.guild.channels.cache.get(id);
        if (ch) await ch.delete().catch(() => {});
      }
      for (const id of Object.values(cache.roles)) {
        const rl = interaction.guild.roles.cache.get(id);
        if (rl && !rl.managed) await rl.delete().catch(() => {});
      }

      CacheManager.saveCache({ lastDeployment: null, roles: {}, categories: {}, channels: {}, emojis: {}, stickers: {}, webhooks: {} });
      return interaction.editReply(`🗑️ **Reset effectué.** Supprimés : ${countChannels} salons/catégories et ${countRoles} rôles.`);
    } finally {
      LockManager.release();
    }
  }

  if (subcommand === 'rollback') {
    LockManager.acquire();
    try {
      await SnapshotManager.restoreSnapshot(interaction.guild);
      return interaction.editReply('🔄 **Rollback terminé !** Le serveur a été réaligné sur le dernier snapshot.');
    } catch (err) {
      return interaction.editReply(`❌ Échec du rollback : ${err.message}`);
    } finally {
      LockManager.release();
    }
  }

  // Deploy / Update / Preview
  const isPreview = subcommand === 'preview';
  LockManager.acquire();

  try {
    const config = loadTemplateConfig(templatePath);
    const cache = CacheManager.getCache();

    if (!isPreview) {
      await SnapshotManager.createSnapshot(interaction.guild);
    }

    const timer = new OperationTimer(`Setup ${subcommand}`);
    
    const roleStats = await RoleBuilder.syncRoles(interaction.guild, config.roles, cache, isPreview);
    const categoryStats = await CategoryBuilder.syncCategories(interaction.guild, config.categories, config.overwrites, cache, isPreview);
    const channelStats = await ChannelBuilder.syncChannels(interaction.guild, config.channels, config.overwrites, cache, isPreview);
    const serverStats = await ServerBuilder.syncServer(interaction.guild, config.server, cache, isPreview);
    const emojiStats = await EmojiBuilder.syncEmojisAndStickers(interaction.guild, config.emojis, config.stickers, cache, isPreview);

    if (!isPreview) {
      CacheManager.saveCache(cache);
    }

    const created = roleStats.created + categoryStats.created + channelStats.created + emojiStats.created;
    const updated = roleStats.updated + categoryStats.updated + channelStats.updated + emojiStats.updated + serverStats.updated;

    const report = timer.end({ created, updated, deleted: 0 });

    const embed = new EmbedBuilder()
      .setTitle(isPreview ? '🔍 Simulation de Déploiement' : '☁️ Rapport de Production')
      .setColor(isPreview ? '#FFA500' : '#00FF7F')
      .addFields(
        { name: 'Créations', value: `${created}`, inline: true },
        { name: 'Modifications', value: `${updated}`, inline: true },
        { name: 'Durée', value: `${report.duration}s`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logError(`Erreur lors de la commande ${subcommand}`, err);
    return interaction.editReply(`❌ **Erreur :** ${err.message}`);
  } finally {
    LockManager.release();
  }
}