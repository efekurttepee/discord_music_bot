import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Şu anki şarkıyı atla');

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying()) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  if (queue.tracks.size === 0 && queue.repeatMode === 0) {
    return await interaction.editReply('❌ Kuyrukta atlanacak şarkı yok!');
  }

  try {
    const currentTrack = queue.currentTrack;
    queue.node.skip();
    await interaction.editReply(`⏭️ **${currentTrack.title}** atlandı!`);
  } catch (error) {
    console.error('Skip command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
