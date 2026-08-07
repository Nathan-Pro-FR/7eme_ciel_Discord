import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { loadTemplateConfig } from '../config/loader.js';
import { CacheManager } from '../utils/cacheManager.js';
import { LockManager } from '../utils/lockManager.js';
import { SnapshotManager } from '../utils/snapshotManager.js';
import { Exporter } from '../utils/exporter.js';
import { DiffEngine } from '../utils/diffEngine.js';
import { MetadataManager } from '../utils/metadataManager.js';

import { ServerBuilder } from '../builders/ServerBuilder.js';
import { RoleBuilder } from '../builders/RoleBuilder.js';
import { CategoryBuilder } from '../builders/CategoryBuilder.js';
import { ChannelBuilder } from '../builders/ChannelBuilder.js';
import { EmojiBuilder } from '../builders/EmojiBuilder.js';
import { log, logError, OperationTimer } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Moteur de déploiement IaC & Snapshot V4')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('deploy').setDescription('Déploiement complet IaC.'))
  .addSubcommand(s => s.setName('update').setDescription('Synchronise avec le modèle JSON.'))
  .addSubcommand(s => s.setName('preview').setDescription('Simule le déploiement.'))
  .addSubcommand(s => s.setName('diff').setDescription('Affiche les écarts entre le serveur et la configuration.'))
  .addSubcommand(s => s.setName('rollback').setDescription('Exécute un vrai rollback V4 à partir du snapshot.'))
  .addSubcommand(s => s.setName('export').setDescription('Exporte l\'intégralité du serveur en JSON V4.'))
  .addSubcommand(s =>
    s.setName('reset')
     .setDescription('Supprime uniquement les canaux/rôles créés par le bot.')
     .addBooleanOption(o => o.setName('confirm').setDescription('Confirmer la suppression sécurisée').setRequired(true))
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Administrateur requis.', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const templatePath = process.env.TEMPLATE_DIR || './discord-template';

  await interaction.deferReply();

  if (subcommand === 'diff') {
    try {
      const config = loadTemplateConfig(templatePath);
      const cache = CacheManager.getCache();
      const diff = DiffEngine.compare(interaction.guild, config, cache);

      const embed = new EmbedBuilder()
        .setTitle('⚖️ Analyse Différence (Discord vs Template)')
        .setColor('#1E90FF')
        .addFields(
          { name: '❌ Rôles manquants', value: diff.missingRoles.join(', ') || 'Aucun', inline: false },
          { name: '❌ Catégories manquantes', value: diff.missingCategories.join(', ') || 'Aucune', inline: false },
          { name: '❌ Salons manquants', value: diff.missingChannels.join(', ') || 'Aucun', inline: false },
          { name: '⚠️ Éléments altérés', value: [...diff.alteredRoles, ...diff.alteredChannels].join(', ') || 'Aucun', inline: false }
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ Erreur diff: ${err.message}`);
    }
  }

  if (subcommand === 'export') {
    try {
      const dir = await Exporter.exportFullTemplate(interaction.guild);
      return interaction.editReply(`📦 **Exportation V4 réussie !** Fichiers générés dans \`${dir}\`.`);
    } catch (err) {
      return interaction.editReply(`❌ Erreur export: ${err.message}`);
    }
  }

  if (subcommand === 'reset') {
    if (!interaction.options.getBoolean('confirm')) {
      return interaction.editReply('⚠️ **Annulé.** Option `confirm: true` manquante.');
    }

    LockManager.acquire();
    try {
      const cache = CacheManager.getCache();
      let deletedChannels = 0;
      let deletedRoles = 0;

      await interaction.guild.channels.fetch();
      for (const [id, ch] of interaction.guild.channels.cache) {
        const isManaged = MetadataManager.isManagedByBot(ch) || Object.values(cache.channels).includes(id) || Object.values(cache.categories).includes(id);
        if (isManaged) {
          await ch.delete('Reset sécurisé V4').catch(() => {});
          deletedChannels++;
        }
      }

      await interaction.guild.roles.fetch();
      for (const [id, rl] of interaction.guild.roles.cache) {
        const isManaged = Object.values(cache.roles).includes(id);
        if (isManaged && !rl.managed && id !== interaction.guild.roles.everyone.id) {
          await rl.delete('Reset sécurisé V4').catch(() => {});
          deletedRoles++;
        }
      }

      CacheManager.saveCache({ lastDeployment: null, roles: {}, categories: {}, channels: {}, emojis: {}, stickers: {}, webhooks: {} });
      return interaction.editReply(`🧹 **Reset protégé terminé.** ${deletedChannels} salons et ${deletedRoles} rôles gérés par le bot ont été supprimés.`);
    } finally {
      LockManager.release();
    }
  }

  if (subcommand === 'rollback') {
    LockManager.acquire();
    try {
      const restoredCache = await SnapshotManager.performFullRollback(interaction.guild);
      CacheManager.saveCache(restoredCache);
      return interaction.editReply('🔄 **Vrai Rollback V4 exécuté !** Le serveur Discord a été entièrement restauré.');
    } catch (err) {
      return interaction.editReply(`❌ Erreur Rollback: ${err.message}`);
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
      await SnapshotManager.createFullSnapshot(interaction.guild, cache);
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
      .setTitle(isPreview ? '🔍 Simulation V4' : '☁️ Déploiement V4 Réussi')
      .setColor(isPreview ? '#FFA500' : '#00FF7F')
      .addFields(
        { name: 'Créés', value: `${created}`, inline: true },
        { name: 'Modifiés', value: `${updated}`, inline: true },
        { name: 'Chrono', value: `${report.duration}s`, inline: true }
      )
      .setFooter({ text: 'Identifiants logiques & métadonnées V4 appliqués' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logError(`Erreur /setup ${subcommand}`, err);
    return interaction.editReply(`❌ Erreur: ${err.message}`);
  } finally {
    LockManager.release();
  }
}