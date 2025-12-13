import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Şu anki şarkıyı atla');

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (player.queue.length === 0 && player.loop === 'NONE') {
    return await interaction.editReply('❌ Kuyrukta atlanacak şarkı yok!');
  }

  try {
    const currentTrack = player.queue.current;
    await player.stop();
    await interaction.editReply(`⏭️ **${currentTrack.info.title}** atlandı!`);
  } catch (error) {
    console.error('Skip command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
