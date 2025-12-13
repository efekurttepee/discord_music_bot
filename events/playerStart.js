import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handlePlayerStart(queue, track) {
  const channel = queue.metadata.channel;

  if (!channel) return;

  try {
    const progress = queue.node.createProgressBar();
    const volume = queue.node.volume;

    const embed = new EmbedBuilder()
      .setTitle('🎵 Now Playing')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: 'Artist', value: track.author || 'Unknown', inline: true },
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Requested By', value: track.requestedBy?.username || 'Unknown', inline: true },
        { name: 'Volume', value: `${volume}%`, inline: true },
        { name: 'Progress', value: progress, inline: false }
      )
      .setColor('#0099ff')
      .setThumbnail(track.thumbnail)
      .setFooter({ text: `Source: ${track.source}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('⏯️ Pause')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('⏭️ Skip')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shuffle')
          .setLabel('🔀 Shuffle')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('loop')
          .setLabel('🔁 Loop')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('🛑 Stop')
          .setStyle(ButtonStyle.Danger)
      );

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
