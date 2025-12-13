import { SlashCommandBuilder } from 'discord.js';
import { useQueue, useMainPlayer } from 'discord-player';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song or playlist from YouTube, Spotify, or Apple Music')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('The song name or URL to play')
      .setRequired(true));

export async function execute(interaction, player) {
  await interaction.deferReply();

  const query = interaction.options.getString('query');
  const channel = interaction.member.voice.channel;

  if (!channel) {
    return await interaction.editReply('You need to be in a voice channel to play music!');
  }

  try {
    // Create queue
    const queue = await player.nodes.create(interaction.guild, {
      metadata: {
        channel: interaction.channel,
        client: interaction.guild.members.me,
        requestedBy: interaction.user
      },
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 300000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 300000,
      volume: 50,
      selfDeaf: true
    });

    // Connect to voice channel
    if (!queue.connection) {
      await queue.connect(channel);
    }

    // Search for the track
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'auto'
    });

    if (!searchResult.hasTracks()) {
      return await interaction.editReply('No tracks found for your query!');
    }

    // Add tracks to queue
    if (searchResult.playlist) {
      await queue.addTrack(searchResult.tracks);
      await interaction.editReply(`✅ Added **${searchResult.tracks.length}** tracks from **${searchResult.playlist.title}** to the queue!`);
    } else {
      const track = searchResult.tracks[0];
      await queue.addTrack(track);
      await interaction.editReply(`✅ Added **${track.title}** to the queue!`);
    }

    // Start playing if not already playing
    if (!queue.node.isPlaying()) {
      await queue.node.play();
    }

  } catch (error) {
    console.error('Play command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
