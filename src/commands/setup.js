import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { loadTemplateConfig } from '../config/loader.js';
import { RoleBuilder } from '../builders/RoleBuilder.js';
import { CategoryBuilder } from '../builders/CategoryBuilder.js';
import { ChannelBuilder } from '../builders/ChannelBuilder.js';
import { EmojiBuilder } from '../builders/EmojiBuilder.js';
import { log, logError } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Gestionnaire du déploiement Infrastructure as Code du 7ème Ciel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('deploy').setDescription('Déploie la structure complète du serveur depuis les fichiers JSON.')
  )
  .addSubcommand(sub =>
    sub.setName('update').setDescription('Synchronise et met à jour le serveur selon les JSON.')
  )
  .addSubcommand(sub =>
    sub.setName('check').setDescription('Affiche l\'état du serveur comparé à la configuration JSON.')
  )
  .addSubcommand(sub =>
    sub.setName('reset').setDescription('Nettoie et réinitialise les salons et rôles gérés par le bot.')
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Vous devez être Administrateur pour exécuter cette commande.', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const templatePath = process.env.TEMPLATE_DIR || './discord-template';

  await interaction.deferReply();

  try {
    const config = loadTemplateConfig(templatePath);

    if (subcommand === 'deploy' || subcommand === 'update') {
      log(`Lancement de l'action : /setup ${subcommand}`);

      const roleMap = await RoleBuilder.syncRoles(interaction.guild, config.roles);
      const categoryMap = await CategoryBuilder.syncCategories(interaction.guild, config.categories);
      const channelMap = await ChannelBuilder.syncChannels(interaction.guild, config.channels, config.overwrites, categoryMap, roleMap);
      await EmojiBuilder.syncEmojisAndStickers(interaction.guild, config.emojis, config.stickers);

      const embed = new EmbedBuilder()
        .setTitle('☁️ Le 7ème Ciel - Rapport de Déploiement')
        .setColor('#87CEEB')
        .setDescription(`Le déploiement via **IaC** s'est terminé avec succès !`)
        .addFields(
          { name: '👑 Rôles configurés', value: `${roleMap.size}`, inline: true },
          { name: '☁️ Catégories créées', value: `${categoryMap.size}`, inline: true },
          { name: '💬 Salons synchronisés', value: `${channelMap.size}`, inline: true }
        )
        .setFooter({ text: 'Logs détaillés disponibles dans logs/deploy.log' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'check') {
      const existingRoles = interaction.guild.roles.cache.size;
      const existingChannels = interaction.guild.channels.cache.filter(c => c.type !== 4).size;
      const existingCategories = interaction.guild.channels.cache.filter(c => c.type === 4).size;

      const embed = new EmbedBuilder()
        .setTitle('🔍 Le 7ème Ciel - Vérification d\'État')
        .setColor('#FFD700')
        .addFields(
          { name: 'Catégories', value: `${existingCategories} présentes / ${config.categories.categories.length} prévues`, inline: true },
          { name: 'Salons', value: `${existingChannels} présents / ${config.channels.channels.length} prévus`, inline: true },
          { name: 'Rôles', value: `${existingRoles} présents / ${config.roles.roles.length} prévus`, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'reset') {
      return interaction.editReply('⚠️ La fonction de reset nécessite une confirmation. Supprimez manuellement les salons pour éviter tout sinistre accidentel sur le serveur.');
    }
  } catch (err) {
    logError(`Échec de la commande /setup ${subcommand}`, err);
    return interaction.editReply(`❌ Une erreur est survenue : **${err.message}**`);
  }
}

