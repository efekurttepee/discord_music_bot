import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Müziği devam ettir');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (!queue.node.isPaused()) {
    return await interaction.editReply('❌ Müzik zaten çalıyor!');
  }

  try {
    queue.node.resume();
    await interaction.editReply('▶️ Müzik devam ediyor!');
  } catch (error) {
    console.error('Resume command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
