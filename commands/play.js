import { SlashCommandBuilder } from 'discord.js';

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
    // Search for the track first
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'auto'
    });

    if (!searchResult.hasTracks()) {
      return await interaction.editReply('No tracks found for your query!');
    }

    // Get or create queue
    let queue = player.nodes.get(interaction.guild);
    
    if (!queue) {
      queue = player.nodes.create(interaction.guild, {
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
    } else {
      // Update metadata if queue already exists
      queue.metadata.channel = interaction.channel;
    }

    // Connect to voice channel if not connected
    try {
      if (!queue.connection || !queue.connection.channel) {
        await queue.connect(channel);
        // Wait a bit for connection to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (connectionError) {
      console.error('Connection error:', connectionError);
      return await interaction.editReply(`❌ Failed to connect to voice channel: ${connectionError.message}`);
    }

    // Add tracks to queue
    const firstTrack = searchResult.tracks[0];
    if (searchResult.playlist) {
      searchResult.tracks.forEach(track => queue.addTrack(track));
      await interaction.editReply(`✅ Added **${searchResult.tracks.length}** tracks from **${searchResult.playlist.title}** to the queue!`);
    } else {
      queue.addTrack(firstTrack);
      await interaction.editReply(`✅ Added **${firstTrack.title}** to the queue!`);
    }

    // Start playing if not already playing
    if (!queue.node.isPlaying() && !queue.node.isPaused()) {
      try {
        await queue.node.play();
        console.log(`✅ Started playing: ${firstTrack.title}`);
      } catch (playError) {
        console.error('Play error:', playError);
        await interaction.editReply(`❌ Failed to start playback: ${playError.message}`);
      }
    }

  } catch (error) {
    console.error('Play command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
