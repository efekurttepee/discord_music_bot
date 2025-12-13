import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleButtonInteraction(interaction, player) {
  if (!interaction.isButton()) return;

  const queue = player.nodes.get(interaction.guild);

  if (!queue) {
    return await interaction.reply({
      content: 'There is no music playing in this server!',
      ephemeral: true
    });
  }

  try {
    switch (interaction.customId) {
      case 'pause':
        if (queue.node.isPaused()) {
          queue.node.resume();
          await interaction.reply('▶️ Resumed playback');
        } else {
          queue.node.pause();
          await interaction.reply('⏸️ Paused playback');
        }
        break;

      case 'skip':
        if (queue.tracks.size === 0) {
          await interaction.reply('❌ No more tracks in the queue!');
        } else {
          queue.node.skip();
          await interaction.reply('⏭️ Skipped to next track');
        }
        break;

      case 'previous':
        if (queue.history.tracks.length === 0) {
          await interaction.reply('❌ No previous tracks available!');
        } else {
          const previousTrack = queue.history.tracks[queue.history.tracks.length - 1];
          queue.insertTrack(previousTrack, 0);
          queue.node.skip();
          await interaction.reply('⏮️ Playing previous track');
        }
        break;

      case 'shuffle':
        queue.tracks.shuffle();
        await interaction.reply('🔀 Queue shuffled!');
        break;

      case 'loop':
        const loopMode = queue.repeatMode;
        if (loopMode === 0) {
          queue.setRepeatMode(1); // Track loop
          await interaction.reply('🔁 Loop mode: Track');
        } else if (loopMode === 1) {
          queue.setRepeatMode(2); // Queue loop
          await interaction.reply('🔁 Loop mode: Queue');
        } else {
          queue.setRepeatMode(0); // Off
          await interaction.reply('🔁 Loop mode: Off');
        }
        break;

      case 'stop':
        queue.delete();
        await interaction.reply('🛑 Music stopped and queue cleared!');
        break;

      default:
        await interaction.reply('❌ Unknown button interaction');
    }
  } catch (error) {
    console.error('Button interaction error:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
  }
}
