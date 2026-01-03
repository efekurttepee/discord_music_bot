const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

// Simple lyrics scraper - no API needed!
async function scrapeLyrics(query) {
	try {
		// Use AZLyrics-style search (works without API)
		const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " lyrics")}`;

		// Try lyrics-finder first (it's already installed)
		const lyricsFinder = require("lyrics-finder");
		const lyrics = await lyricsFinder(query, "");

		if (lyrics && lyrics.trim().length > 0) {
			return lyrics;
		}

		return null;
	} catch (error) {
		return null;
	}
}

const command = new SlashCommand()
	.setName("lyrics")
	.setDescription("Get the lyrics of a song")
	.addStringOption((option) =>
		option
			.setName("song")
			.setDescription("Song name or Artist - Song Name")
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
						.setDescription(
							"No song specified and nothing is playing.\n\n" +
							"**Usage:**\n" +
							"`/lyrics song: Artist - Song Name`\n" +
							"or play a song and use `/lyrics`"
						),
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
				.replace(/\[.*?feat\..*?\]/gi, '')
				.replace(/\|.*$/gi, '')
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
			const lyrics = await scrapeLyrics(searchQuery);

			if (!lyrics || lyrics.trim().length === 0) {
				// Create Google search link as fallback
				const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " lyrics")}`;

				return interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(client.config.embedColor)
							.setTitle("🔍 Lyrics Not Found")
							.setDescription(
								`Could not find lyrics for: **${searchQuery}**\n\n` +
								`[🔎 Search on Google](${googleSearchUrl})\n\n` +
								`**Tips:**\n` +
								`• Try: \`Artist - Song Name\`\n` +
								`• Use English names\n` +
								`• Check spelling`
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
					text: 'Lyrics from web sources',
				});

			return interaction.editReply({
				embeds: [lyricsEmbed],
			});

		} catch (error) {
			client.error("Lyrics error:", error);

			// Always provide Google search as fallback
			const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " lyrics")}`;

			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor(client.config.embedColor)
						.setTitle("🔍 Search for Lyrics")
						.setDescription(
							`Could not automatically fetch lyrics for: **${searchQuery}**\n\n` +
							`[🔎 Search on Google](${googleSearchUrl})\n\n` +
							`Click the link above to find lyrics manually.`
						),
				],
			});
		}
	});

module.exports = command;
