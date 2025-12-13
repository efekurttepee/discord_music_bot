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

export async function execute(interaction, poru) {
  await interaction.deferReply();

  const player = poru.players.get(interaction.guild.id);

  if (!player || !player.queue.current) {
    return await interaction.editReply('❌ Bu sunucuda çalan müzik yok!');
  }

  const volume = interaction.options.getInteger('level');

  try {
    player.setVolume(volume);
    await interaction.editReply(`🔊 Ses seviyesi **${volume}%** olarak ayarlandı!`);
  } catch (error) {
    console.error('Volume command error:', error);
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
}
