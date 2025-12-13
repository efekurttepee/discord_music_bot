import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop the music and clear the queue');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.editReply('There is no music playing in this server!');
  }

  try {
    queue.delete();
    await interaction.editReply('⏹️ Music stopped and queue cleared!');
  } catch (error) {
    console.error('Stop command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
