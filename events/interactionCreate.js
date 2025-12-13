import { EmbedBuilder } from 'discord.js';

export async function handleButtonInteraction(interaction, player) {
  if (!interaction.isButton()) return;

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.reply({
      content: '❌ Bu sunucuda çalan müzik yok!',
      ephemeral: true
    });
  }

  try {
    switch (interaction.customId) {
      case 'pause':
        if (queue.node.isPaused()) {
          queue.node.resume();
          await interaction.reply({ content: '▶️ Müzik devam ediyor!', ephemeral: true });
        } else {
          queue.node.pause();
          await interaction.reply({ content: '⏸️ Müzik duraklatıldı!', ephemeral: true });
        }
        // Update now playing message
        if (queue.metadata.nowPlayingMessage) {
          try {
            const { handlePlayerStart } = await import('./playerStart.js');
            await handlePlayerStart(queue, queue.currentTrack);
          } catch (error) {
            console.error('Error updating now playing message:', error);
          }
        }
        break;

      case 'skip':
        if (queue.tracks.size === 0 && queue.repeatMode === 0) {
          await interaction.reply({ content: '❌ Kuyrukta atlanacak şarkı yok!', ephemeral: true });
        } else {
          const skippedTrack = queue.currentTrack;
          queue.node.skip();
          await interaction.reply({ 
            content: `⏭️ **${skippedTrack?.title || 'Şarkı'}** atlandı!`, 
            ephemeral: true 
          });
        }
        break;

      case 'previous':
        if (queue.history.tracks.length === 0) {
          await interaction.reply({ content: '❌ Önceki şarkı bulunamadı!', ephemeral: true });
        } else {
          const previousTrack = queue.history.tracks[queue.history.tracks.length - 1];
          queue.insertTrack(previousTrack, 0);
          queue.node.skip();
          await interaction.reply({ content: '⏮️ Önceki şarkı çalınıyor!', ephemeral: true });
        }
        break;

      case 'shuffle':
        if (queue.tracks.size === 0) {
          await interaction.reply({ content: '❌ Kuyrukta karıştırılacak şarkı yok!', ephemeral: true });
        } else {
          queue.tracks.shuffle();
          await interaction.reply({ content: '🔀 Kuyruk karıştırıldı!', ephemeral: true });
        }
        break;

      case 'loop':
        const loopMode = queue.repeatMode;
        if (loopMode === 0) {
          queue.setRepeatMode(1); // Track loop
          await interaction.reply({ content: '🔁 Döngü modu: Şarkı', ephemeral: true });
        } else if (loopMode === 1) {
          queue.setRepeatMode(2); // Queue loop
          await interaction.reply({ content: '🔁 Döngü modu: Kuyruk', ephemeral: true });
        } else {
          queue.setRepeatMode(0); // Off
          await interaction.reply({ content: '🔁 Döngü modu: Kapalı', ephemeral: true });
        }
        break;

      case 'stop':
        queue.delete();
        await interaction.reply({ content: '🛑 Müzik durduruldu ve kuyruk temizlendi!', ephemeral: true });
        break;

      default:
        await interaction.reply({ content: '❌ Bilinmeyen buton etkileşimi', ephemeral: true });
    }
  } catch (error) {
    console.error('Button interaction error:', error);
    const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
    
    if (!interaction.replied) {
      try {
        await interaction.reply({
          content: `❌ Hata: ${errorMessage}`,
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Reply error:', replyError);
      }
    } else {
      try {
        await interaction.followUp({
          content: `❌ Hata: ${errorMessage}`,
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('Follow-up error:', followUpError);
      }
    }
  }
}
