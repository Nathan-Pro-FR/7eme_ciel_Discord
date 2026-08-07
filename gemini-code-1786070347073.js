import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { loadTemplateConfig } from '../config/loader.js';
import { CacheManager } from '../utils/cacheManager.js';
import { ServerBuilder } from '../builders/ServerBuilder.js';
import { RoleBuilder } from '../builders/RoleBuilder.js';
import { CategoryBuilder } from '../builders/CategoryBuilder.js';
import { ChannelBuilder } from '../builders/ChannelBuilder.js';
import { EmojiBuilder } from '../builders/EmojiBuilder.js';
import { log, logError, OperationTimer } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Système IaC du 7ème Ciel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub.setName('deploy').setDescription('Déploie entièrement le serveur à partir du template JSON.'))
  .addSubcommand(sub => sub.setName('update').setDescription('Synchronise l\'état actuel avec la configuration.'))
  .addSubcommand(sub => sub.setName('preview').setDescription('Simule le déploiement sans aucune modification.'))
  .addSubcommand(sub => sub.setName('rollback').setDescription('Restaure l\'état du serveur avant le dernier déploiement.'))
  .addSubcommand(sub => sub.setName('check').setDescription('Affiche un rapport d\'état entre Discord et la config.'))
  .addSubcommand(sub => sub.setName('reset').setDescription('Affiche les instructions de remise à zéro.'));

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Réservé aux Administrateurs.', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const templatePath = process.env.TEMPLATE_DIR || './discord-template';

  await interaction.deferReply();

  try {
    const config = loadTemplateConfig(templatePath);

    if (subcommand === 'rollback') {
      log('Lancement du rollback...');
      CacheManager.restoreBackup();
      return interaction.editReply('🔄 **Rollback effectué !** Le cache et l\'état de la configuration précédente ont été restaurés.');
    }

    const isPreview = subcommand === 'preview';
    const cache = CacheManager.getCache();

    if (!isPreview) {
      CacheManager.createBackup();
    }

    const timer = new OperationTimer(`Setup ${subcommand}`);
    log(`Exécution de /setup ${subcommand}...`);

    const serverStats = await ServerBuilder.syncServer(interaction.guild, config.server, isPreview);
    const roleStats = await RoleBuilder.syncRoles(interaction.guild, config.roles, cache, isPreview);
    const categoryStats = await CategoryBuilder.syncCategories(interaction.guild, config.categories, config.overwrites, cache, isPreview);
    const channelStats = await ChannelBuilder.syncChannels(interaction.guild, config.channels, config.overwrites, cache, isPreview);
    const emojiStats = await EmojiBuilder.syncEmojisAndStickers(interaction.guild, config.emojis, config.stickers, cache, isPreview);

    if (!isPreview) {
      CacheManager.saveCache(cache);
    }

    const totalCreated = serverStats.created + roleStats.created + categoryStats.created + channelStats.created + emojiStats.created;
    const totalUpdated = serverStats.updated + roleStats.updated + categoryStats.updated + channelStats.updated + emojiStats.updated;

    const report = timer.end({ created: totalCreated, updated: totalUpdated, deleted: 0 });

    const embed = new EmbedBuilder()
      .setTitle(isPreview ? '🔍 Prévisualisation du Déploiement (Simulation)' : '☁️ Rapport d\'Exécution IaC')
      .setColor(isPreview ? '#FFA500' : '#87CEEB')
      .setDescription(isPreview ? 'Changements simulés sans modifier le serveur :' : 'Opération appliquée avec succès !')
      .addFields(
        { name: '✨ Éléments créés', value: `${totalCreated}`, inline: true },
        { name: '🔄 Éléments modifiés', value: `${totalUpdated}`, inline: true },
        { name: '⏱️ Durée totale', value: `${report.duration}s`, inline: true }
      )
      .setFooter({ text: 'Suivi via data/deployed.json & logs/deploy.log' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });

  } catch (err) {
    logError(`Échec /setup ${subcommand}`, err);
    return interaction.editReply(`❌ Erreur lors de l'exécution : **${err.message}**`);
  }
}