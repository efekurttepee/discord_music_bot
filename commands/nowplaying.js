import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show information about the currently playing track');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.editReply('There is no music playing in this server!');
  }

  if (!queue.currentTrack) {
    return await interaction.editReply('No track is currently playing!');
  }

  try {
    const track = queue.currentTrack;
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
          .setCustomId('previous')
          .setLabel('⏮️ Previous')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shuffle')
          .setLabel('🔀 Shuffle')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('loop')
          .setLabel('🔁 Loop')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('NowPlaying command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
