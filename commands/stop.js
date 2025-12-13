import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Müziği durdur ve kuyruğu temizle');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  try {
    await player.destroy();
    await interaction.editReply('⏹️ Müzik durduruldu ve kuyruk temizlendi!');
  } catch (error) {
    console.error('Stop command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
