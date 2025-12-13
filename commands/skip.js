import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.editReply('There is no music playing in this server!');
  }

  if (queue.tracks.size === 0) {
    return await interaction.editReply('No more tracks in the queue!');
  }

  try {
    queue.node.skip();
    await interaction.editReply('⏭️ Skipped to next track!');
  } catch (error) {
    console.error('Skip command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
