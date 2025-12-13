import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Müzik kuyruğunu göster');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (player.queue.length === 0) {
    return await interaction.editReply('❌ Kuyruk boş!');
  }

  try {
    const currentTrack = player.queue.current;
    const tracks = player.queue;
    const totalTracks = tracks.length;
    const displayedTracks = Array.from(tracks).slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle('🎵 Müzik Kuyruğu')
      .setColor('#0099ff')
      .setThumbnail(currentTrack.info.image);

    // Current track
    const progressBar = player.createProgressBar();
    embed.addFields({
      name: '🎵 Şu An Çalıyor',
      value: `[${currentTrack.info.title}](${currentTrack.info.uri})\n**Sanatçı:** ${currentTrack.info.author || 'Bilinmiyor'}\n**Süre:** ${formatDuration(currentTrack.info.length) || 'Bilinmiyor'}\n${progressBar}`,
      inline: false
    });

    // Upcoming tracks
    if (displayedTracks.length > 0) {
      const trackList = displayedTracks.map((track, index) => {
        const position = index + 1;
        return `\`${position}.\` [${track.info.title}](${track.info.uri}) - ${formatDuration(track.info.length) || 'Bilinmiyor'}`;
      }).join('\n');

      embed.addFields({
        name: `📋 Sıradaki Şarkılar (${totalTracks})`,
        value: trackList.length > 1024 ? trackList.substring(0, 1021) + '...' : trackList,
        inline: false
      });
    } else if (totalTracks === 0) {
      embed.addFields({
        name: '📋 Sıradaki Şarkılar',
        value: 'Kuyrukta şarkı yok',
        inline: false
      });
    }

    // Queue info
    const loopMode = player.loop === 'NONE' ? 'Kapalı' : player.loop === 'TRACK' ? 'Şarkı' : 'Kuyruk';
    embed.setFooter({ 
      text: `Toplam: ${totalTracks} şarkı | Ses: ${player.volume}% | Döngü: ${loopMode}` 
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Queue command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
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
