import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Şu an çalan şarkı hakkında bilgi göster');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying()) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (!queue.currentTrack) {
    return await interaction.editReply('❌ Şu anda çalan şarkı yok!');
  }

  try {
    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();
    const volume = queue.node.volume;
    const isPaused = queue.node.isPaused();

    const embed = new EmbedBuilder()
      .setTitle(isPaused ? '⏸️ Duraklatıldı' : '🎵 Şu An Çalıyor')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: '🎤 Sanatçı', value: track.author || 'Bilinmiyor', inline: true },
        { name: '⏱️ Süre', value: track.duration || 'Bilinmiyor', inline: true },
        { name: '👤 İsteyen', value: track.requestedBy?.username || 'Bilinmiyor', inline: true },
        { name: '🔊 Ses', value: `${volume}%`, inline: true },
        { name: '📊 İlerleme', value: progress || 'Yükleniyor...', inline: false }
      )
      .setColor(isPaused ? '#FFA500' : '#0099ff')
      .setThumbnail(track.thumbnail)
      .setFooter({ text: `Kaynak: ${track.source || 'Bilinmiyor'}` });

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
