import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handlePlayerStart(queue, track) {
  const channel = queue.metadata.channel;

  if (!channel) {
    console.warn('⚠️ No channel found in queue metadata');
    return;
  }

  try {
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

    // Delete old now playing message if exists
    if (queue.metadata.nowPlayingMessage) {
      try {
        await queue.metadata.nowPlayingMessage.delete().catch(() => {});
      } catch (error) {
        // Ignore deletion errors
      }
    }

    const message = await channel.send({
      embeds: [embed],
      components: [row]
    });

    // Store the message ID for later updates
    queue.metadata.nowPlayingMessage = message;

  } catch (error) {
    console.error('Player start event error:', error);
  }
}
