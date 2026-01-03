const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");

// Detailed Station List
const stations = {
    "kralpop": { name: "Kral Pop", url: "https://kralpopw.radyotvonline.com/kralpop/kralpop/playlist.m3u8", emoji: "🇹🇷" },
    "powerfm": { name: "Power FM", url: "https://powerfm.listenpowerapp.com/powerfm/mpeg/icecast.audio", emoji: "🔥" },
    "joyfm": { name: "Joy FM", url: "https://joyfm.listenpowerapp.com/joyfm/mpeg/icecast.audio", emoji: "🐢" },
    "virgin": { name: "Virgin Radio", url: "https://virginturkiye.radyotvonline.com/virginturkiye/virginradio/playlist.m3u8", emoji: "🚗" },
    "fenomen": { name: "Radyo Fenomen", url: "https://fenomen.listenfenomen.com/fenomen/128/icecast.audio", emoji: "🎧" },
    "lofi": { name: "Lofi Girl", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", emoji: "☕" },
    "dream": { name: "Dream Türk", url: "https://dreamturk.radyotvonline.com/dreamturk/dreamturk/playlist.m3u8", emoji: "🎤" },
    "show": { name: "Show Radyo", url: "http://46.20.7.126/;stream.mp3", emoji: "📻" }
};

const command = new SlashCommand()
    .setName("radio")
    .setDescription("Open the Radio Tuner Panel")
    .setRun(async (client, interaction, options) => {
        let channel = await client.getChannel(client, interaction);
        if (!channel) return;

        // Create Dropdown Menu
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('radio_select')
                    .setPlaceholder('Select a Radio Station to Play')
                    .addOptions([
                        {
                            label: 'Kral Pop (Türkçe Pop)',
                            description: 'En hit Türkçe şarkılar',
                            value: 'kralpop',
                            emoji: '🇹🇷',
                        },
                        {
                            label: 'Power FM (Yabancı Hit)',
                            description: 'En yeni yabancı hitler',
                            value: 'powerfm',
                            emoji: '🔥',
                        },
                        {
                            label: 'Joy FM (Slow)',
                            description: 'En iyi aşk şarkıları',
                            value: 'joyfm',
                            emoji: '🐢',
                        },
                        {
                            label: 'Virgin Radio (Pop)',
                            description: 'Karnaval',
                            value: 'virgin',
                            emoji: '🚗',
                        },
                        {
                            label: 'Radyo Fenomen',
                            description: 'Maksimum Hit Müzik',
                            value: 'fenomen',
                            emoji: '🎧',
                        },
                        {
                            label: 'Lofi Girl',
                            description: 'Ders ve Odaklanma',
                            value: 'lofi',
                            emoji: '☕',
                        },
                    ]),
            );

        const embed = new MessageEmbed()
            .setColor("BLUE")
            .setTitle("📻 VibeMusic Radio Tuner")
            .setDescription("Please select a station from the menu below.\nThe bot will join your voice channel and start streaming live.")
            .setThumbnail(client.config.iconURL);

        await interaction.reply({ embeds: [embed], components: [row] });

        // Listener for Menu Interaction
        const filter = i => i.customId === 'radio_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const selectedValue = i.values[0];
            const station = stations[selectedValue];

            await i.update({ content: `Connecting to **${station.name}**...`, components: [] });

            // Connect and Play Logic
            let node = await client.getLavalink(client);
            if (!node) return i.followUp({ content: "Lavalink not connected!", ephemeral: true });

            let player = client.createPlayer(i.channel, channel);
            if (player.state !== "CONNECTED") player.connect();

            // Handle Stage Channels
            if (channel.type == "GUILD_STAGE_VOICE") {
                setTimeout(() => {
                    if (i.guild.members.me.voice.suppress) {
                        i.guild.members.me.voice.setSuppressed(false).catch(() => i.guild.members.me.voice.setRequestToSpeak(true));
                    }
                }, 2000);
            }

            let res = await player.search(station.url, i.user);

            if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
                return i.followUp(`Failed to load ${station.name}. Stream might be offline.`);
            }

            if (res.tracks && res.tracks.length > 0) {
                const track = res.tracks[0];
                track.title = `🔴 LIVE: ${station.name}`;
                track.isStream = true;

                player.queue.clear();
                player.stop();
                player.queue.add(track);
                player.play();

                const successEmbed = new MessageEmbed()
                    .setColor("GREEN")
                    .setDescription(`✅ **Connected!** Now playing: **${station.name}** ${station.emoji}`);

                await i.followUp({ embeds: [successEmbed] });
            }
        });
    });

module.exports = command;
