import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Display the current music queue');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.editReply('There is no music playing in this server!');
  }

  if (queue.tracks.size === 0) {
    return await interaction.editReply('The queue is empty!');
  }

  try {
    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray().slice(0, 10); // Show first 10 tracks

    const embed = new EmbedBuilder()
      .setTitle('🎵 Music Queue')
      .setDescription(`**Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) - \`${currentTrack.duration}\`\n\n**Up Next:**`)
      .setColor('#0099ff')
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({ text: `Queue length: ${queue.tracks.size} tracks` });

    if (tracks.length > 0) {
      const trackList = tracks.map((track, index) =>
        `\`${index + 1}.\` [${track.title}](${track.url}) - \`${track.duration}\``
      ).join('\n');

      embed.addFields({ name: 'Tracks', value: trackList });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Queue command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
