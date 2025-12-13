import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Bot gecikmesini kontrol et');

export async function execute(interaction) {
  const startTime = Date.now();
  const sent = await interaction.reply({ 
    content: '🏓 Gecikme ölçülüyor...'
  });
  
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  const embed = new EmbedBuilder()
    .setTitle('🏓 Ping Bilgisi')
    .addFields(
      { name: '📡 Bot Gecikmesi', value: `${latency}ms`, inline: true },
      { name: '🌐 API Gecikmesi', value: `${apiLatency}ms`, inline: true }
    )
    .setColor('#0099ff')
    .setTimestamp();

  await sent.edit({ embeds: [embed] });
}
