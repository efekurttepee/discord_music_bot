const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const { getLyrics, getSong } = require("genius-lyrics-api");

const command = new SlashCommand()
	.setName("lyrics")
	.setDescription("Get the lyrics of a song")
	.addStringOption((option) =>
		option
			.setName("song")
			.setDescription("The song to get lyrics for (format: Artist - Song)")
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
		} else {
			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("Lavalink node is not connected"),
				],
			});
		}

		const args = options.getString("song");
		if (!args && !player) {
			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("There's nothing playing and no song was specified"),
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
				.trim();
			searchQuery = title;
		}

		if (!searchQuery) {
			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor("RED")
						.setDescription("Please provide a song name"),
				],
			});
		}

		try {
			// Get Genius API token from environment variable or config
			const geniusToken = process.env.GENIUS_API_TOKEN || client.config.geniusApiToken;

			if (!geniusToken) {
				return interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor("RED")
							.setTitle("Genius API Not Configured")
							.setDescription(
								"The Genius API token is not configured.\n\n" +
								"**Railway Setup:**\n" +
								"1. Go to Railway project → Variables\n" +
								"2. Add: `GENIUS_API_TOKEN` = your token\n" +
								"3. Redeploy\n\n" +
								"**Get a token:** https://genius.com/api-clients"
							),
					],
				});
			}

			const options = {
				apiKey: geniusToken,
				title: searchQuery,
				artist: "",
				optimizeQuery: true
			};

			const lyrics = await getLyrics(options);

			if (!lyrics) {
				return interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor("RED")
							.setDescription(
								`No lyrics found for: \`${searchQuery}\`\n\n` +
								`**Tip:** Try searching with format: \`Artist - Song Name\``
							),
					],
				});
			}

			// Split lyrics if too long
			const maxLength = 4096;
			let lyricsText = lyrics;

			if (lyricsText.length > maxLength) {
				lyricsText = lyricsText.substring(0, maxLength - 50) + "\n\n... (truncated)";
			}

			const lyricsEmbed = new MessageEmbed()
				.setColor(client.config.embedColor)
				.setTitle(`🎵 ${searchQuery}`)
				.setDescription(lyricsText)
				.setFooter({
					text: 'Lyrics provided by Genius',
					iconURL: 'https://images.genius.com/8ed669cadd956443e29c70361ec4f372.1000x1000x1.png'
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
						.setDescription(
							`Failed to fetch lyrics for: \`${searchQuery}\`\n\n` +
							`**Error:** ${error.message || 'Unknown error'}\n\n` +
							`**Tip:** Try searching with format: \`Artist - Song Name\``
						),
				],
			});
		}
	});

module.exports = command;
