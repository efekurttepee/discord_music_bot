// SSL Certificate Fix - Must be at the very top before any imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Core imports using ES Modules
import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Poru } from 'poru';
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

// Create Discord client
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

// Initialize Poru client
const poru = new Poru(client, [
    {
        name: 'Public Node 1',
        host: 'lavalink.ferguz.net',
        port: 443,
        password: 'youshallnotpass',
        secure: true
    },
    {
        name: 'Public Node 2',
        host: 'lava.link',
        port: 80,
        password: 'youshallnotpass',
        secure: false
    }
], {
    defaultPlatform: 'ytsearch',
    reconnectTries: 5,
    reconnectTimeout: 30000,
    resumeKey: 'DiscordMusicBot',
    resumeTimeout: 300
});

// Attach Poru to client for easy access
client.poru = poru;

// Poru Event: Node Connect
poru.on('nodeConnect', (node) => {
    console.log(`✅ Lavalink connected! Node: ${node.name}`);
});

// Poru Event: Node Disconnect
poru.on('nodeDisconnect', (node, reason) => {
    console.error(`❌ Lavalink disconnected! Node: ${node.name}, Reason: ${reason}`);
    console.log('🔄 Attempting to reconnect...');
});

// Poru Event: Node Error
poru.on('nodeError', (node, error) => {
    console.error(`❌ Lavalink node error! Node: ${node.name}, Error:`, error);
    console.log('🔄 Trying other nodes...');
});

// Poru Event: Track Start
poru.on('trackStart', (player, track) => {
    const channel = player.textChannel;
    if (!channel) return;

    try {
        const queue = player.queue;
        const progressBar = player.createProgressBar();

        const embed = new EmbedBuilder()
            .setTitle('🎵 Şu An Çalıyor')
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .addFields(
                { name: '🎤 Sanatçı', value: track.info.author || 'Bilinmiyor', inline: true },
                { name: '⏱️ Süre', value: formatDuration(track.info.length) || 'Bilinmiyor', inline: true },
                { name: '👤 İsteyen', value: track.requester?.username || 'Bilinmiyor', inline: true },
                { name: '🔊 Ses', value: `${player.volume}%`, inline: true },
                { name: '📊 İlerleme', value: progressBar || 'Yükleniyor...', inline: false }
            )
            .setColor('#0099ff')
            .setThumbnail(track.info.image)
            .setFooter({ text: `Kaynak: ${track.info.sourceName || 'Bilinmiyor'}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pause')
                    .setLabel(player.isPaused ? '▶️ Devam Et' : '⏸️ Duraklat')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('⏭️ Atla')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shuffle')
                    .setLabel('🔀 Karıştır')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop')
                    .setLabel('🔁 Döngü')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('🛑 Durdur')
                    .setStyle(ButtonStyle.Danger)
            );

        channel.send({ embeds: [embed], components: [row] })
            .then(msg => {
                player.data.set('nowPlayingMessage', msg);
            })
            .catch(error => {
                console.error('Failed to send now playing message:', error);
            });
    } catch (error) {
        console.error('Error in trackStart event:', error);
    }
});

// Poru Event: Queue End
poru.on('queueEnd', (player) => {
    const channel = player.textChannel;
    if (channel) {
        channel.send('✅ Kuyruk bitti!').catch(() => {});
    }
});

// Poru Event: Track Error
poru.on('trackError', (player, track, error) => {
    console.error('Track error:', error);
    const channel = player.textChannel;
    if (channel) {
        channel.send(`❌ Şarkı çalınırken hata oluştu: ${error.message || 'Bilinmeyen hata'}`).catch(() => {});
    }
});

// Poru Event: Player Destroy
poru.on('playerDestroy', (player) => {
    const channel = player.textChannel;
    if (channel) {
        channel.send('🛑 Müzik durduruldu ve kuyruk temizlendi!').catch(() => {});
    }
});

// Helper function to format duration
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return null;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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

    if (interaction.isCommand() && interaction.commandName) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ Bu komut bulunamadı. Lütfen birkaç dakika bekleyip tekrar deneyin.', 
                        ephemeral: true 
                    });
                }
            } catch (error) {
                // Ignore interaction errors
            }
            return;
        }

        try {
            await command.execute(interaction, poru);
        } catch (error) {
            console.error('Command execution error:', error);
            
            if (error.code === 10062 || (error.message.includes('interaction') && error.message.includes('not found'))) {
                console.warn('⚠️ Interaction expired or not found');
                return;
            }

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
                if (followUpError.code !== 10062 && followUpError.code !== 404) {
                    console.error('Follow-up error:', followUpError);
                }
            }
        }
    }
});

// Button interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        const player = poru.players.get(interaction.guild.id);
        
        if (!player || !player.queue.current) {
            return await interaction.reply({
                content: '❌ Bu sunucuda çalan müzik yok!',
                ephemeral: true
            });
        }

        switch (interaction.customId) {
            case 'pause':
                player.pause(!player.isPaused);
                await interaction.reply({ 
                    content: player.isPaused ? '⏸️ Müzik duraklatıldı!' : '▶️ Müzik devam ediyor!', 
                    ephemeral: true 
                });
                break;

            case 'skip':
                if (player.queue.length === 0 && player.loop === 'NONE') {
                    await interaction.reply({ content: '❌ Kuyrukta atlanacak şarkı yok!', ephemeral: true });
                } else {
                    await player.stop();
                    await interaction.reply({ content: '⏭️ Şarkı atlandı!', ephemeral: true });
                }
                break;

            case 'shuffle':
                if (player.queue.length <= 1) {
                    await interaction.reply({ content: '❌ Kuyrukta karıştırılacak şarkı yok!', ephemeral: true });
                } else {
                    player.queue.shuffle();
                    await interaction.reply({ content: '🔀 Kuyruk karıştırıldı!', ephemeral: true });
                }
                break;

            case 'loop':
                const loopMode = player.loop;
                if (loopMode === 'NONE') {
                    player.setLoop('TRACK');
                    await interaction.reply({ content: '🔁 Döngü modu: Şarkı', ephemeral: true });
                } else if (loopMode === 'TRACK') {
                    player.setLoop('QUEUE');
                    await interaction.reply({ content: '🔁 Döngü modu: Kuyruk', ephemeral: true });
                } else {
                    player.setLoop('NONE');
                    await interaction.reply({ content: '🔁 Döngü modu: Kapalı', ephemeral: true });
                }
                break;

            case 'stop':
                await player.destroy();
                await interaction.reply({ content: '🛑 Müzik durduruldu ve kuyruk temizlendi!', ephemeral: true });
                break;

            default:
                await interaction.reply({ content: '❌ Bilinmeyen buton etkileşimi', ephemeral: true });
        }
    } catch (error) {
        console.error('Button interaction error:', error);
        try {
            await interaction.reply({
                content: `❌ Hata: ${error.message}`,
                ephemeral: true
            });
        } catch (replyError) {
            console.error('Reply error:', replyError);
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

const token = process.env.DISCORD_TOKEN.trim();
const tokenLength = token.length;
const tokenPreview = tokenLength > 10 ? `${token.substring(0, 5)}...${token.substring(tokenLength - 5)}` : '***';

console.log(`🔑 Token detected (length: ${tokenLength}, preview: ${tokenPreview})`);

if (tokenLength < 50 || tokenLength > 80) {
    console.warn(`⚠️ Token length (${tokenLength}) seems unusual. Discord bot tokens are usually 59-72 characters.`);
}

client.login(token)
    .then(() => {
        console.log('✅ Bot connecting to Discord...');
    })
    .catch(error => {
        console.error('❌ Failed to connect to Discord:', error.message);
        console.error('🔹 Get a new token from: https://discord.com/developers/applications');
        process.exit(1);
    });

// Register slash commands when bot is ready
client.once('ready', async () => {
    try {
        console.log(`✅ Logged in as ${client.user.tag}!`);
        console.log(`🌍 Serving ${client.guilds.cache.size} guild(s)`);

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        console.log('🔄 Refreshing application (/) commands...');
        
        try {
            const data = await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            
            console.log(`✅ Successfully reloaded ${commands.length} application (/) commands.`);
            console.log(`📝 Registered commands: ${commands.map(c => c.name).join(', ')}`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (commandError) {
            console.error('❌ Failed to register commands:', commandError);
            setTimeout(async () => {
                try {
                    await rest.put(
                        Routes.applicationCommands(client.user.id),
                        { body: commands }
                    );
                    console.log('✅ Commands registered on retry');
                } catch (retryError) {
                    console.error('❌ Retry failed:', retryError);
                }
            }, 5000);
        }

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

        console.log('🎵 Bot is ready to play music with Lavalink!');
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
        lavalinkNodes: poru.nodes.size,
        connectedNodes: poru.nodes.filter(node => node.isConnected).size,
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
export { client, poru, app, formatDuration };
