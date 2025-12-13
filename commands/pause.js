import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Müziği duraklat/devam ettir');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying()) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  try {
    if (queue.node.isPaused()) {
      queue.node.resume();
      await interaction.editReply('▶️ Müzik devam ediyor!');
    } else {
      queue.node.pause();
      await interaction.editReply('⏸️ Müzik duraklatıldı!');
    }
  } catch (error) {
    console.error('Pause command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
