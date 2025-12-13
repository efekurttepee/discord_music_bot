// SSL Certificate Fix - Must be at the very top before any imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Force FFmpeg path and play-dl engine
import ffmpegPath from 'ffmpeg-static';
process.env.FFMPEG_PATH = ffmpegPath;
process.env.DP_FORCE_YTDL_MOD = "play-dl";

// YouTube Cookie Authentication and Optimization
if (process.env.YOUTUBE_COOKIE) {
    process.env.DP_FORCE_YTDL_COOKIE = process.env.YOUTUBE_COOKIE;
    process.env.YTDL_NO_UPDATE = 'true';
}

// Spotify API Configuration
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
}

// Import play-dl explicitly to ensure it's available
import 'play-dl';

// Core imports using ES Modules
import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import dotenv from 'dotenv';
import { readdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import express from 'express';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure proxy if provided in .env
let proxyAgent = null;
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    try {
        proxyAgent = new HttpsProxyAgent(process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
        console.log('✅ Proxy configured');
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
        agent: proxyAgent || undefined
    },
    ws: {
        large_threshold: 250,
        compress: true
    }
});

// Audio dependency check
console.log('✅ Audio dependencies: opusscript and libsodium-wrappers installed');

// Create player instance with play-dl configuration
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
    autoSelfDeaf: true,
    skipFFmpeg: false
});

// Debug logging (filtered to reduce spam)
player.events.on('debug', (queue, message) => {
    const msg = message?.toString() || '';
    if (msg.toLowerCase().includes('voice') || msg.toLowerCase().includes('connection')) {
        console.log(`[Voice Debug] ${msg}`);
    }
});

// Load default extractors (includes YouTube, Spotify, SoundCloud, etc.)
try {
    await player.extractors.loadMulti(DefaultExtractors);
    console.log('✅ Audio extractors loaded successfully');
} catch (error) {
    console.error('❌ Failed to load extractors:', error.message);
}

// Error handling
player.events.on('error', (queue, error) => {
    console.error(`[${queue?.guild?.name || 'Unknown'}] Queue error:`, error.message);
});

player.events.on('playerError', (queue, error) => {
    console.error(`[Player Error] ${error.message}`);
    if (error.stack) {
        console.error(`[Player Error Stack] ${error.stack}`);
    }
});

// Player events
player.events.on('playerStart', async (queue, track) => {
    try {
        const { handlePlayerStart } = await import('./events/playerStart.js');
        await handlePlayerStart(queue, track);
    } catch (error) {
        console.error('Player start event error:', error);
    }
});

player.events.on('audioTrackAdd', (queue, track) => {
    console.log(`✅ Track added to queue: ${track.title}`);
});

player.events.on('disconnect', (queue) => {
    console.log(`🔌 Disconnected from voice channel in ${queue.guild.name}`);
});

player.events.on('emptyChannel', (queue) => {
    console.log(`⚠️ Channel is empty in ${queue.guild.name}`);
});

player.events.on('emptyQueue', (queue) => {
    console.log(`✅ Queue finished in ${queue.guild.name}`);
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = await import(`file://${filePath}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        }
    } catch (error) {
        console.error(`❌ Failed to load command ${file}:`, error.message);
    }
}

// Interaction handler for slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction, player);
    } catch (error) {
        console.error('Command execution error:', error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: `❌ Bir hata oluştu: ${error.message}`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `❌ Bir hata oluştu: ${error.message}`, 
                    ephemeral: true 
                });
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

    try {
        const { handleButtonInteraction } = await import('./events/interactionCreate.js');
        await handleButtonInteraction(interaction, player);
    } catch (error) {
        console.error('Button interaction error:', error);
        if (!interaction.replied) {
            try {
                await interaction.reply({
                    content: `❌ Bir hata oluştu: ${error.message}`,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Reply error:', replyError);
            }
        }
    }
});

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('YouTube veya Spotify\'dan müzik çal')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Şarkı adı, URL veya Spotify linki')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Müziği durdur ve kuyruğu temizle'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Şu anki şarkıyı atla'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Müzik kuyruğunu göster'),
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Şu an çalan şarkı hakkında bilgi göster'),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Müziği duraklat/devam ettir'),
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Müziği devam ettir'),
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ses seviyesini ayarla')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Ses seviyesi (0-200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot gecikmesini kontrol et'),
    new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Botu yeniden başlat (Sadece sahibi)')
].map(command => command.toJSON());

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN environment variable is missing!');
    console.error('🔹 Please create a .env file and add your Discord bot token.');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('✅ Bot connecting to Discord...');
    })
    .catch(error => {
        console.error('❌ Failed to connect to Discord:', error.message);
        console.error('🔹 Check your internet connection');
        console.error('🔹 Verify your Discord token in .env file');
        process.exit(1);
    });

// Register slash commands when bot is ready
client.once('ready', async () => {
    try {
        console.log(`✅ Logged in as ${client.user.tag}!`);
        console.log(`🌍 Serving ${client.guilds.cache.size} guild(s)`);

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        console.log('🔄 Refreshing application (/) commands...');
        
        // Register commands globally
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log(`✅ Successfully reloaded ${commands.length} application (/) commands.`);

        // Check for restart notification
        const restartStatePath = path.join(__dirname, 'restart_state.json');
        if (existsSync(restartStatePath)) {
            try {
                const restartState = JSON.parse(readFileSync(restartStatePath, 'utf8'));
                const channel = await client.channels.fetch(restartState.channelId);
                if (channel && channel.isTextBased()) {
                    const message = await channel.messages.fetch(restartState.messageId);
                    if (message) {
                        await message.edit(`✅ Sistem tekrar çevrimiçi! (Gecikme: ${client.ws.ping}ms)`);
                    }
                }
            } catch (error) {
                console.error('Failed to update restart notification:', error.message);
            } finally {
                if (existsSync(restartStatePath)) {
                    unlinkSync(restartStatePath);
                }
            }
        }

        console.log('🎵 Bot is ready to play music!');
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
});

// Express Keep-Alive server
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('🎵 Discord Music Bot is Alive!');
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
    // Don't exit, let the bot try to recover
});

// Export for use in other files
export { client, player, app };
