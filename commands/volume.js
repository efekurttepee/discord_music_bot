import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Ses seviyesini ayarla')
  .addIntegerOption(option =>
    option.setName('level')
      .setDescription('Ses seviyesi (0-200)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(200));

export async function execute(interaction, player) {
  await interaction.deferReply();

  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying()) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  const volume = interaction.options.getInteger('level');

  try {
    queue.node.setVolume(volume);
    await interaction.editReply(`🔊 Ses seviyesi **${volume}%** olarak ayarlandı!`);
  } catch (error) {
    console.error('Volume command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
