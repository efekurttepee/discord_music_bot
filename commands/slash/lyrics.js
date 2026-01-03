const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const lyricsFinder = require("lyrics-finder");

const command = new SlashCommand()
	.setName("lyrics")
	.setDescription("Get the lyrics of a song")
	.addStringOption((option) =>
		option
			.setName("song")
			.setDescription("The song to search for (Artist - Song or just Song Name)")
			.setRequired(false),
	)
	.setRun(async (client, interaction, options) => {
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setColor(client.config.embedColor)
					.setDescription("🔎 **Searching for lyrics...**"),
			],
		});

		let player;
		if (client.manager) {
			player = client.manager.players.get(interaction.guild.id);
		}

		const args = options.getString("song");
		if (!args && !player) {
			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("There's nothing playing and no song was specified.\n\nUsage: `/lyrics song: Artist - Song Name`"),
				],
			});
		}

		let searchQuery = args;
		if (!args && player && player.queue.current) {
			// Clean up the title
			let title = player.queue.current.title;
			title = title
				.replace(/\(official.*?\)/gi, '')
				.replace(/\[official.*?\]/gi, '')
				.replace(/official video/gi, '')
				.replace(/official audio/gi, '')
				.replace(/lyrics/gi, '')
				.replace(/lyric video/gi, '')
				.replace(/\(.*?remix.*?\)/gi, '')
				.replace(/\[.*?remix.*?\]/gi, '')
				.replace(/\(.*?ft\..*?\)/gi, '')
				.replace(/\[.*?ft\..*?\]/gi, '')
				.trim();
			searchQuery = title;
		}

		if (!searchQuery || searchQuery.length < 2) {
			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("Please provide a valid song name"),
				],
			});
		}

		try {
			// lyrics-finder automatically searches multiple sources
			const lyrics = await lyricsFinder(searchQuery, "") || await lyricsFinder("", searchQuery);

			if (!lyrics || lyrics.trim().length === 0) {
				return interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor("RED")
							.setTitle("No Lyrics Found")
							.setDescription(
								`Could not find lyrics for: \`${searchQuery}\`\n\n` +
								`**Tips:**\n` +
								`• Try format: \`Artist - Song Name\`\n` +
								`• Use English song/artist names\n` +
								`• Check spelling\n\n` +
								`**Example:** \`/lyrics song: Queen - Bohemian Rhapsody\``
							),
					],
				});
			}

			// Split lyrics if too long
			const maxLength = 4096;
			let lyricsText = lyrics;

			if (lyricsText.length > maxLength) {
				lyricsText = lyricsText.substring(0, maxLength - 100) + "\n\n... *(lyrics truncated)*";
			}

			const lyricsEmbed = new MessageEmbed()
				.setColor(client.config.embedColor)
				.setTitle(`🎵 ${searchQuery}`)
				.setDescription(lyricsText)
				.setFooter({
					text: 'Lyrics from multiple sources',
				});

			return interaction.editReply({
				embeds: [lyricsEmbed],
			});

		} catch (error) {
			client.error("Lyrics error:", error);

			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setTitle("Error Fetching Lyrics")
						.setDescription(
							`Failed to fetch lyrics for: \`${searchQuery}\`\n\n` +
							`**Error:** ${error.message || 'Unknown error'}\n\n` +
							`**Try:**\n` +
							`• Different search terms\n` +
							`• Format: \`Artist - Song Name\`\n` +
							`• Popular English songs work best`
						),
				],
			});
		}
	});

module.exports = command;
