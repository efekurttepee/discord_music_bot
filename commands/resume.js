import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Müziği devam ettir');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (!player.isPaused) {
    return await interaction.editReply('❌ Müzik zaten çalıyor!');
  }

  try {
    player.pause(false);
    await interaction.editReply('▶️ Müzik devam ediyor!');
  } catch (error) {
    console.error('Resume command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
