const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

// Custom Genius scraper - no API key needed!
async function scrapeGeniusLyrics(query) {
	try {
		// Step 1: Search Genius for the song
		const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
		const searchResponse = await axios.get(searchUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});

		// Find the first song result
		const sections = searchResponse.data.response.sections;
		let songUrl = null;

		for (const section of sections) {
			if (section.type === 'song' && section.hits && section.hits.length > 0) {
				songUrl = section.hits[0].result.url;
				break;
			}
		}

		if (!songUrl) {
			return null;
		}

		// Step 2: Scrape the lyrics from the song page
		const pageResponse = await axios.get(songUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});

		const $ = cheerio.load(pageResponse.data);

		// Genius stores lyrics in div[data-lyrics-container="true"]
		let lyrics = '';
		$('div[data-lyrics-container="true"]').each((i, elem) => {
			// Convert br tags to newlines before getting text
			$(elem).find('br').replaceWith('\n');
			// Also handle different line break elements
			$(elem).find('p').after('\n\n');

			lyrics += $(elem).text() + '\n\n';
		});

		// Clean up the lyrics
		lyrics = lyrics
			.trim()
			// Remove contributor info at the start
			.replace(/^\d+\s*Contributors.*?$/gm, '')
			.replace(/^Translations.*?$/gm, '')
			.replace(/^Deutsch.*?$/gm, '')
			.replace(/^Türkçe.*?$/gm, '')
			.replace(/^Español.*?$/gm, '')
			.replace(/^Português.*?$/gm, '')
			.replace(/^Français.*?$/gm, '')
			.replace(/^Polski.*?$/gm, '')
			.replace(/^Русский.*?$/gm, '')
			.replace(/^Česky.*?$/gm, '')
			.replace(/^ไทย.*?$/gm, '')
			.replace(/^فارسی.*?$/gm, '')
			// Remove "Read More" and similar
			.replace(/Read More.*$/gm, '')
			.replace(/See .*? Live.*$/gm, '')
			// Remove extra blank lines (but keep double newlines for verses)
			.replace(/\n{4,}/g, '\n\n')
			.trim();

		if (lyrics.length > 0) {
			return lyrics;
		}

		return null;
	} catch (error) {
		console.error('Genius scraper error:', error.message);
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
			// Try our custom Genius scraper
			const lyrics = await scrapeGeniusLyrics(searchQuery);

			if (!lyrics || lyrics.trim().length === 0) {
				// Create search links as fallback
				const geniusSearchUrl = `https://genius.com/search?q=${encodeURIComponent(searchQuery)}`;
				const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " lyrics")}`;

				return interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setColor(client.config.embedColor)
							.setTitle("🔍 Lyrics Not Found")
							.setDescription(
								`Could not find lyrics for: **${searchQuery}**\n\n` +
								`**Search manually:**\n` +
								`🎵 [Search on Genius](${geniusSearchUrl})\n` +
								`🔎 [Search on Google](${googleSearchUrl})\n\n` +
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
					text: 'Lyrics from Genius.com',
					iconURL: 'https://images.genius.com/8ed669cadd956443e29c70361ec4f372.1000x1000x1.png'
				});

			return interaction.editReply({
				embeds: [lyricsEmbed],
			});

		} catch (error) {
			client.error("Lyrics error:", error);

			// Always provide search links as fallback
			const geniusSearchUrl = `https://genius.com/search?q=${encodeURIComponent(searchQuery)}`;
			const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " lyrics")}`;

			return interaction.editReply({
				embeds: [
					new MessageEmbed()
						.setColor(client.config.embedColor)
						.setTitle("🔍 Search for Lyrics")
						.setDescription(
							`Error fetching lyrics for: **${searchQuery}**\n\n` +
							`**Search manually:**\n` +
							`🎵 [Search on Genius](${geniusSearchUrl})\n` +
							`🔎 [Search on Google](${googleSearchUrl})`
						),
				],
			});
		}
	});

module.exports = command;
