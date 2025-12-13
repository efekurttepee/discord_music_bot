import { Client, GatewayIntentBits } from 'discord.js';
import { Poru } from 'poru';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================================
// CRITICAL: Initialize Poru INSIDE ready event
// ==========================================
client.once('ready', () => {
  console.log('✅ Bot ready:', client.user.tag);
  
  // Define Lavalink nodes
  const nodes = [{
    name: 'main',
    host: 'lava.link',
    port: 80,
    password: 'anything',
    secure: false
  }];
  
  // Create Poru instance - THIS MUST BE HERE
  client.poru = new Poru(client, nodes, {
    library: 'discord.js',
    defaultPlatform: 'ytsearch'
  });
  
  // Setup all Poru event listeners AFTER initialization
  client.poru.on('nodeConnect', (node) => {
    console.log('✅ Lavalink connected:', node.name);
  });
  
  client.poru.on('nodeDisconnect', (node) => {
    console.log('⚠️ Lavalink disconnected:', node.name);
  });
  
  client.poru.on('nodeError', (node, error) => {
    console.error('❌ Lavalink error:', node.name, error.message);
  });
  
  client.poru.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
      channel.send(`🎵 Now playing: **${track.info.title}** by **${track.info.author}**`);
    }
  });
  
  client.poru.on('trackEnd', (player, track) => {
    console.log('Track ended:', track.info.title);
  });
  
  client.poru.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
      channel.send('✅ Queue finished! Leaving voice channel.');
    }
    player.destroy();
  });
  
  client.poru.on('playerCreate', (player) => {
    console.log('Player created for guild:', player.guildId);
  });
  
  client.poru.on('playerDestroy', (player) => {
    console.log('Player destroyed for guild:', player.guildId);
  });
});

// ==========================================
// Message Commands
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // !play command
  if (message.content.startsWith('!play')) {
    const query = message.content.slice(6).trim();
    
    if (!query) {
      return message.reply('❌ Usage: `!play <song name or URL>`');
    }
    
    if (!message.member.voice.channel) {
      return message.reply('❌ You must be in a voice channel!');
    }
    
    try {
      // Get or create player
      let player = client.poru.players.get(message.guild.id);
      
      if (!player) {
        player = client.poru.createConnection({
          guildId: message.guild.id,
          voiceChannel: message.member.voice.channel.id,
          textChannel: message.channel.id,
          deaf: true
        });
        console.log('Created player for guild:', message.guild.id);
      }
      
      // Search for track
      await message.channel.send('🔍 Searching...');
      const resolve = await client.poru.resolve({ 
        query: query, 
        requester: message.author 
      });
      
      const { loadType, tracks, playlistInfo } = resolve;
      
      if (loadType === 'empty' || loadType === 'error') {
        return message.channel.send('❌ No results found!');
      }
      
      if (loadType === 'playlist') {
        for (const track of tracks) {
          player.queue.add(track);
        }
        message.channel.send(`✅ Added playlist: **${playlistInfo.name}** (${tracks.length} tracks)`);
      } else {
        const track = tracks[0];
        player.queue.add(track);
        message.channel.send(`✅ Added to queue: **${track.info.title}**`);
      }
      
      // Start playing if not already
      if (!player.isPlaying && !player.isPaused) {
        player.play();
      }
      
    } catch (error) {
      console.error('Play command error:', error);
      message.channel.send(`❌ Error: ${error.message}`);
    }
  }
  
  // !skip command
  if (message.content === '!skip') {
    const player = client.poru.players.get(message.guild.id);
    if (!player) return message.reply('❌ Nothing is playing!');
    if (!message.member.voice.channel) return message.reply('❌ Join voice channel!');
    
    player.stop();
    message.channel.send('⏭️ Skipped!');
  }
  
  // !stop command
  if (message.content === '!stop') {
    const player = client.poru.players.get(message.guild.id);
    if (!player) return message.reply('❌ Nothing is playing!');
    if (!message.member.voice.channel) return message.reply('❌ Join voice channel!');
    
    player.destroy();
    message.channel.send('⏹️ Stopped and disconnected!');
  }
  
  // !queue command
  if (message.content === '!queue' || message.content === '!q') {
    const player = client.poru.players.get(message.guild.id);
    if (!player) return message.reply('❌ Nothing is playing!');
    
    if (player.queue.length === 0) {
      return message.channel.send('📜 Queue is empty!');
    }
    
    const queue = player.queue.map((t, i) => `${i + 1}. **${t.info.title}**`);
    message.channel.send(
      `📜 **Queue:**\n${queue.slice(0, 10).join('\n')}` +
      (player.queue.length > 10 ? `\n...and ${player.queue.length - 10} more` : '')
    );
  }
  
  // !np (now playing) command
  if (message.content === '!np' || message.content === '!nowplaying') {
    const player = client.poru.players.get(message.guild.id);
    if (!player || !player.currentTrack) {
      return message.reply('❌ Nothing is playing!');
    }
    
    const track = player.currentTrack;
    message.channel.send(`🎵 Now playing: **${track.info.title}** by **${track.info.author}**`);
  }
  
  // !pause command
  if (message.content === '!pause') {
    const player = client.poru.players.get(message.guild.id);
    if (!player) return message.reply('❌ Nothing is playing!');
    
    player.pause(true);
    message.channel.send('⏸️ Paused!');
  }
  
  // !resume command
  if (message.content === '!resume') {
    const player = client.poru.players.get(message.guild.id);
    if (!player) return message.reply('❌ Nothing is playing!');
    
    player.pause(false);
    message.channel.send('▶️ Resumed!');
  }
  
  // !help command
  if (message.content === '!help') {
    message.channel.send({
      embeds: [{
        color: 0x0099ff,
        title: '🎵 Music Bot Commands',
        fields: [
          { name: '!play <song>', value: 'Play a song', inline: false },
          { name: '!skip', value: 'Skip current song', inline: true },
          { name: '!stop', value: 'Stop and disconnect', inline: true },
          { name: '!pause', value: 'Pause playback', inline: true },
          { name: '!resume', value: 'Resume playback', inline: true },
          { name: '!queue (!q)', value: 'Show queue', inline: true },
          { name: '!np', value: 'Now playing', inline: true },
          { name: '!help', value: 'Show this message', inline: true }
        ],
        footer: { text: 'Music bot powered by Poru & Lavalink' }
      }]
    });
  }
});

// ==========================================
// Error Handling
// ==========================================
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// ==========================================
// Login
// ==========================================
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN environment variable is missing!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
