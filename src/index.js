import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { log, logError } from './utils/logger.js';
import * as setupCommand from './commands/setup.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildModeration
  ]
});

client.once('ready', async () => {
  log(`🤖 Bot connecté en tant que ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    log('Enregistrement des commandes Slash...');
    const commandsData = [setupCommand.data.toJSON()];

    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandsData }
      );
      log(`Commandes Slash enregistrées sur la Guild : ${process.env.GUILD_ID}`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsData }
      );
      log('Commandes Slash enregistrées globalement.');
    }
  } catch (err) {
    logError('Erreur d\'enregistrement des commandes Slash', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setup') {
    await setupCommand.execute(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  logError('Erreur d\'authentification Discord API', err);
});
