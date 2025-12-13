import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Şu an çalan şarkı hakkında bilgi göster');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  try {
    const track = player.queue.current;
    const progressBar = player.createProgressBar();
    const volume = player.volume;
    const isPaused = player.isPaused;

    const embed = new EmbedBuilder()
      .setTitle(isPaused ? '⏸️ Duraklatıldı' : '🎵 Şu An Çalıyor')
      .setDescription(`[${track.info.title}](${track.info.uri})`)
      .addFields(
        { name: '🎤 Sanatçı', value: track.info.author || 'Bilinmiyor', inline: true },
        { name: '⏱️ Süre', value: formatDuration(track.info.length) || 'Bilinmiyor', inline: true },
        { name: '👤 İsteyen', value: track.requester?.username || 'Bilinmiyor', inline: true },
        { name: '🔊 Ses', value: `${volume}%`, inline: true },
        { name: '📊 İlerleme', value: progressBar || 'Yükleniyor...', inline: false }
      )
      .setColor(isPaused ? '#FFA500' : '#0099ff')
      .setThumbnail(track.info.image)
      .setFooter({ text: `Kaynak: ${track.info.sourceName || 'Bilinmiyor'}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel(isPaused ? '▶️ Devam Et' : '⏸️ Duraklat')
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

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('NowPlaying command error:', error);
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
