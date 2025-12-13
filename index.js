// SSL Certificate Fix - Must be at the very top before any imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, REST, Routes } from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import express from 'express';

// Load environment variables
dotenv.config();

// Configure proxy if provided in .env
let proxyAgent = null;
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  try {
    proxyAgent = new HttpsProxyAgent(process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
    console.log('✅ Proxy configured:', process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
  } catch (error) {
    console.error('❌ Proxy configuration failed:', error.message);
    console.log('🔹 Running without proxy...');
  }
}

// Create Discord client with enhanced timeout settings and proxy support
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  rest: {
    timeout: 60000, // Increased request timeout to 60s
    retries: 3,      // Automatic retry for failed requests
    offset: 0,       // No rate limit offset
    agent: proxyAgent // Use proxy if configured
  },
  ws: {
    large_threshold: 250, // Increased large message threshold
    compress: true         // Enable compression for better performance
  }
});

// Create player instance with optimized settings
const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    dlChunkSize: 0,        // Let discord-player handle chunking
    liveBuffer: 20000,     // 20s buffer for live streams
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }
  },
  connectionTimeout: 30000, // 30s connection timeout
  lagMonitor: 60000,        // 60s lag monitoring
  autoSelfDeaf: true        // Auto-deafen to prevent echo
});

// Load default extractors using the new loadMulti method
await player.extractors.loadMulti(DefaultExtractors);

// Configure Spotify extractor with OAuth
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  player.extractors.register('SpotifyExtractor', {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
}

// Enhanced error handling for player events
player.events.on('error', (queue, error) => {
  console.log(`[${queue?.guild?.name || 'Unknown'}] Error emitted from the queue: ${error.message}`);
});

player.events.on('playerError', (queue, error) => {
  console.log(`[${queue?.guild?.name || 'Unknown'}] Error emitted from the player: ${error.message}`);
});

// Command collection
client.commands = new Collection();

// Load commands
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Player events
player.events.on('playerStart', async (queue, track) => {
  const { handlePlayerStart } = await import('./events/playerStart.js');
  await handlePlayerStart(queue, track);
});

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, player);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true
    });
  }
});

// Button interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { handleButtonInteraction } = await import('./events/interactionCreate.js');
  await handleButtonInteraction(interaction, player);
});

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the music'),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips current song'),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check latency')
];

// Login to Discord with error handling
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('✅ Bot connected successfully!');
  })
  .catch(error => {
    console.error('❌ Failed to connect to Discord:', error.message);
    console.log('🔹 Check your internet connection');
    console.log('🔹 Verify your Discord token in .env file');
    console.log('🔹 Ensure Discord API is accessible');
  });

// Register slash commands when bot is ready using REST API
client.on('ready', async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
    console.log(`🎵 ${client.user.tag} is online and ready!`);
    console.log(`🌍 Serving ${client.guilds.cache.size} guilds`);
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
});

// Create Express server for Render.com keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🎵 Flux Music Bot is Alive!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: client.user ? client.user.tag : 'Not connected',
    guilds: client.guilds.cache.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Keep-alive server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Export for use in other files
export { client, player, app };
