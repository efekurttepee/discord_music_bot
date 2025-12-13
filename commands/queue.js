import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Müzik kuyruğunu göster');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying()) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (queue.tracks.size === 0 && !queue.currentTrack) {
    return await interaction.editReply('❌ Kuyruk boş!');
  }

  try {
    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();
    const totalTracks = tracks.length;
    const displayedTracks = tracks.slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle('🎵 Müzik Kuyruğu')
      .setColor('#0099ff')
      .setThumbnail(currentTrack?.thumbnail || null);

    // Current track
    if (currentTrack) {
      const progress = queue.node.createProgressBar();
      embed.addFields({
        name: '🎵 Şu An Çalıyor',
        value: `[${currentTrack.title}](${currentTrack.url})\n**Sanatçı:** ${currentTrack.author || 'Bilinmiyor'}\n**Süre:** ${currentTrack.duration || 'Bilinmiyor'}\n${progress}`,
        inline: false
      });
    }

    // Upcoming tracks
    if (displayedTracks.length > 0) {
      const trackList = displayedTracks.map((track, index) => {
        const position = index + 1;
        return `\`${position}.\` [${track.title}](${track.url}) - ${track.duration || 'Bilinmiyor'}`;
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
    const loopMode = queue.repeatMode === 0 ? 'Kapalı' : queue.repeatMode === 1 ? 'Şarkı' : 'Kuyruk';
    embed.setFooter({ 
      text: `Toplam: ${totalTracks} şarkı | Ses: ${queue.node.volume}% | Döngü: ${loopMode}` 
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Queue command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
