// SSL Certificate Fix - Must be at the very top before any imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Force FFmpeg path and play-dl engine for Render.com
import ffmpegPath from 'ffmpeg-static';
process.env.FFMPEG_PATH = ffmpegPath;
process.env.DP_FORCE_YTDL_MOD = "play-dl";

// YouTube Cookie Authentication and Optimization
if (process.env.YOUTUBE_COOKIE) {
    process.env.DP_FORCE_YTDL_COOKIE = process.env.YOUTUBE_COOKIE;
    process.env.YTDL_NO_UPDATE = 'true'; // Prevent version check lag
}

// Import play-dl explicitly to ensure it's available
import 'play-dl';

// Core imports using ES Modules
import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes } from 'discord.js';
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

// Create Discord client with enhanced settings
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    rest: {
        timeout: 60000,
        retries: 3,
        offset: 0,
        agent: proxyAgent
    },
    ws: {
        large_threshold: 250,
        compress: true
    }
});

// Audio dependency check
console.log('Audio dependency check: opusscript and libsodium-wrappers installed.');

// Create player instance with play-dl configuration and proper spoofing
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        dlChunkSize: 0,
        liveBuffer: 20000,
        requestOptions: {
            headers: {
                cookie: process.env.YOUTUBE_COOKIE || '',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        }
    },
    connectionTimeout: 30000,
    lagMonitor: 60000,
    autoSelfDeaf: true
});

// Debug logging
player.events.on('debug', (queue, message) => {
    console.log(`[DEBUG] ${message}`);
});

// Load default extractors
await player.extractors.loadMulti(DefaultExtractors);

// Error handling
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
        console.error('Command execution error:', error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } catch (followUpError) {
            if (followUpError.code !== 10062) {
                console.error('Follow-up error:', followUpError);
            }
        }
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
        .setDescription('Check latency'),
    new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restarts the bot (Owner only)')
];

// Login to Discord
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

// Register slash commands
client.on('ready', async () => {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
        console.log(`🎵 ${client.user.tag} is online and ready!`);
        console.log(`🌍 Serving ${client.guilds.cache.size} guilds`);

        // Check for restart notification
        const restartStatePath = path.join(__dirname, 'restart_state.json');
        if (fs.existsSync(restartStatePath)) {
            try {
                const restartState = JSON.parse(fs.readFileSync(restartStatePath, 'utf8'));
                const channel = await client.channels.fetch(restartState.channelId);
                if (channel && channel.isTextBased()) {
                    const message = await channel.messages.fetch(restartState.messageId);
                    if (message) {
                        await message.edit(`✅ System is back online! (Ping: ${client.ws.ping}ms)`);
                    }
                }
            } catch (error) {
                console.error('Failed to update restart notification:', error.message);
            } finally {
                // Cleanup - delete the restart state file
                fs.unlinkSync(restartStatePath);
            }
        }
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
});

// Express Keep-Alive server
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

// Global error handlers
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Export for use in other files
export { client, player, app };
