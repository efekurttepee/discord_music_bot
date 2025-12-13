import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('YouTube veya Spotify\'dan müzik çal')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Şarkı adı, URL veya Spotify linki')
      .setRequired(true));

export async function execute(interaction, poru) {
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
    // Get or create player
    let player = poru.players.get(interaction.guild.id);
    
    if (!player) {
      player = poru.createConnection({
        guildId: interaction.guild.id,
        voiceChannel: channel.id,
        textChannel: interaction.channel.id,
        deaf: true,
        mute: false
      });
    } else {
      player.setVoiceChannel(channel.id);
      player.setTextChannel(interaction.channel.id);
    }

    // Resolve the query using Poru
    const resolve = await poru.resolve({
      query: query,
      source: 'youtube', // Default source
      requester: interaction.user
    });

    if (!resolve || resolve.tracks.length === 0) {
      return await interaction.editReply('❌ Şarkı bulunamadı!');
    }

    // Check if it's a playlist
    if (resolve.loadType === 'PLAYLIST_LOADED') {
      // Add all tracks from playlist
      for (const track of resolve.tracks) {
        track.requester = interaction.user;
        player.queue.add(track);
      }

      const embed = new EmbedBuilder()
        .setTitle('🎵 Çalma Listesi Eklendi')
        .setDescription(`✅ **${resolve.tracks.length}** şarkı **${resolve.playlistInfo.name}** çalma listesinden kuyruğa eklendi!`)
        .setColor('#0099ff')
        .setThumbnail(resolve.tracks[0]?.info?.image || null);

      await interaction.editReply({ embeds: [embed] });

      // Start playing if not already playing
      if (!player.isPlaying && !player.isPaused) {
        await player.play();
      }
    } else {
      // Single track
      const track = resolve.tracks[0];
      track.requester = interaction.user;
      player.queue.add(track);

      const embed = new EmbedBuilder()
        .setTitle('🎵 Müzik Eklendi')
        .setDescription(`✅ **${track.info.title}** kuyruğa eklendi!`)
        .setColor('#0099ff')
        .setThumbnail(track.info.image)
        .addFields(
          { name: 'Sanatçı', value: track.info.author || 'Bilinmiyor', inline: true },
          { name: 'Süre', value: formatDuration(track.info.length) || 'Bilinmiyor', inline: true },
          { name: 'Kaynak', value: track.info.sourceName || 'Bilinmiyor', inline: true }
        );

      await interaction.editReply({ embeds: [embed] });

      // Start playing if not already playing
      if (!player.isPlaying && !player.isPaused) {
        await player.play();
      }
    }

  } catch (error) {
    console.error('Play command error:', error);
    const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
    await interaction.editReply(`❌ Hata: ${errorMessage}`);
  }
}

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
