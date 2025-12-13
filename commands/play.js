import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('YouTube veya Spotify\'dan müzik çal')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Şarkı adı, URL veya Spotify linki')
      .setRequired(true));

export async function execute(interaction, player) {
  await interaction.deferReply();

  const query = interaction.options.getString('query');
  const channel = interaction.member?.voice?.channel;

  if (!channel) {
    return await interaction.editReply('❌ Müzik çalmak için bir ses kanalında olmalısın!');
  }

  // Check if bot has permission to join and speak
  const botMember = interaction.guild.members.me;
  if (!channel.permissionsFor(botMember)?.has(['Connect', 'Speak'])) {
    return await interaction.editReply('❌ Ses kanalına katılma veya konuşma iznim yok!');
  }

  try {
    // Search for the track
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'auto'
    });

    if (!searchResult.hasTracks()) {
      return await interaction.editReply('❌ Aradığın şarkı bulunamadı!');
    }

    // Get or create queue
    let queue = player.nodes.get(interaction.guild);
    
    if (!queue) {
      queue = player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          client: interaction.guild.members.me,
          requestedBy: interaction.user
        },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        volume: 50,
        selfDeaf: true,
        skipFFmpeg: false
      });
    } else {
      // Update metadata if queue already exists
      queue.metadata.channel = interaction.channel;
    }

    // Connect to voice channel if not connected
    try {
      if (!queue.connection || !queue.connection.channel) {
        await queue.connect(channel);
        // Wait a bit for connection to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (queue.connection.channel.id !== channel.id) {
        // If bot is in a different channel, reconnect
        queue.node.disconnect();
        await queue.connect(channel);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (connectionError) {
      console.error('Connection error:', connectionError);
      return await interaction.editReply(`❌ Ses kanalına bağlanılamadı: ${connectionError.message}`);
    }

    // Add tracks to queue
    const firstTrack = searchResult.tracks[0];
    let replyMessage = '';

    if (searchResult.playlist) {
      // Add all tracks from playlist
      for (const track of searchResult.tracks) {
        queue.addTrack(track);
      }
      replyMessage = `✅ **${searchResult.tracks.length}** şarkı **${searchResult.playlist.title}** çalma listesinden kuyruğa eklendi!`;
    } else {
      // Add single track
      queue.addTrack(firstTrack);
      replyMessage = `✅ **${firstTrack.title}** kuyruğa eklendi!`;
    }

    // Create embed for response
    const embed = new EmbedBuilder()
      .setTitle('🎵 Müzik Eklendi')
      .setDescription(replyMessage)
      .setColor('#0099ff');

    if (searchResult.playlist) {
      embed.setThumbnail(searchResult.playlist.thumbnail || firstTrack.thumbnail);
    } else {
      embed
        .setThumbnail(firstTrack.thumbnail)
        .addFields(
          { name: 'Sanatçı', value: firstTrack.author || 'Bilinmiyor', inline: true },
          { name: 'Süre', value: firstTrack.duration || 'Bilinmiyor', inline: true },
          { name: 'Kaynak', value: firstTrack.source || 'Bilinmiyor', inline: true }
        );
    }

    await interaction.editReply({ embeds: [embed] });

    // Start playing if not already playing
    if (!queue.node.isPlaying() && !queue.node.isPaused()) {
      try {
        // Ensure connection is ready
        if (!queue.connection || !queue.connection.state || queue.connection.state.status !== 'ready') {
          console.log('⏳ Waiting for voice connection to be ready...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Ensure queue has tracks
        if (queue.tracks.size === 0 && !queue.currentTrack) {
          throw new Error('No tracks in queue to play');
        }

        console.log(`🎵 Attempting to play track in ${interaction.guild.name}`);
        await queue.node.play();
        console.log(`✅ Playback started successfully`);
      } catch (playError) {
        console.error('❌ Play error:', playError);
        console.error('Error stack:', playError.stack);
        
        try {
          await interaction.followUp({
            content: `❌ Çalma başlatılamadı: ${playError.message}\n🔹 Lütfen tekrar deneyin veya başka bir şarkı deneyin.`,
            ephemeral: true
          });
        } catch (followUpError) {
          console.error('Failed to send follow-up:', followUpError);
        }
      }
    } else {
      console.log(`ℹ️ Music already playing or paused in ${interaction.guild.name}`);
    }

  } catch (error) {
    console.error('Play command error:', error);
    const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
    await interaction.editReply(`❌ Hata: ${errorMessage}`);
  }
}
