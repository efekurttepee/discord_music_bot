import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Müziği duraklat/devam ettir');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  try {
    player.pause(!player.isPaused);
    await interaction.editReply(player.isPaused ? '⏸️ Müzik duraklatıldı!' : '▶️ Müzik devam ediyor!');
  } catch (error) {
    console.error('Pause command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
