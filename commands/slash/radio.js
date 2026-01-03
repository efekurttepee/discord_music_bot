const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");

const stations = {
    "lofi": {
        name: "Lofi Girl (Study/Relax)",
        url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        color: "#2f3136"
    },
    "kralpop": {
        name: "Kral Pop",
        url: "https://kralpopw.radyotvonline.com/kralpop/kralpop/playlist.m3u8",
        color: "#ff0000"
    },
    "powerfm": {
        name: "Power FM",
        url: "https://powerfm.listenpowerapp.com/powerfm/mpeg/icecast.audio",
        color: "#e60000"
    },
    "joyfm": {
        name: "Joy FM",
        url: "https://joyfm.listenpowerapp.com/joyfm/mpeg/icecast.audio",
        color: "#d4a017"
    },
    "virgin": {
        name: "Virgin Radio",
        url: "https://virginturkiye.radyotvonline.com/virginturkiye/virginradio/playlist.m3u8",
        color: "#c20000"
    },
    "fenomen": {
        name: "Radyo Fenomen",
        url: "https://fenomen.listenfenomen.com/fenomen/128/icecast.audio",
        color: "#9b00ff"
    }
};

const command = new SlashCommand()
    .setName("radio")
    .setDescription("Plays a live radio station")
    .addStringOption((option) =>
        option
            .setName("station")
            .setDescription("Select a radio station")
            .setRequired(true)
            .addChoices(
                { name: "Lofi Girl (Study/Relax)", value: "lofi" },
                { name: "Kral Pop (TR Play)", value: "kralpop" },
                { name: "Power FM (Foreign Hits)", value: "powerfm" },
                { name: "Joy FM (Slow)", value: "joyfm" },
                { name: "Virgin Radio (Pop)", value: "virgin" },
                { name: "Radyo Fenomen (Hit)", value: "fenomen" }
            )
    )
    .setRun(async (client, interaction, options) => {
        let channel = await client.getChannel(client, interaction);
        if (!channel) return;

        let node = await client.getLavalink(client);
        if (!node) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("Lavalink node is not connected")],
            });
        }

        const stationKey = options.getString("station");
        const station = stations[stationKey];

        let player = client.createPlayer(interaction.channel, channel);

        if (player.state !== "CONNECTED") {
            player.connect();
        }

        // Force stage channel handling if needed
        if (channel.type == "GUILD_STAGE_VOICE") {
            setTimeout(() => {
                if (interaction.guild.members.me.voice.suppress == true) {
                    interaction.guild.members.me.voice.setSuppressed(false).catch(err => {
                        interaction.guild.members.me.voice.setRequestToSpeak(true);
                    });
                }
            }, 2000);
        }

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor(station.color)
                    .setDescription(`📡 **Searching signal for ${station.name}...**`),
            ],
            fetchReply: true,
        });

        let res = await player.search(station.url, interaction.user).catch((err) => {
            client.error(err);
            return { loadType: "LOAD_FAILED" };
        });

        if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
            if (!player.queue.current) player.destroy();
            return interaction.editReply({
                embeds: [client.ErrorEmbed("Could not connect to the radio station at this moment.")],
            });
        }

        if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT" || res.loadType === "PLAYLIST_LOADED") {
            // Use the first track found (usually the stream itself)
            const track = res.tracks[0];
            // Set metadata to look nice on dashboard/embed
            track.title = `🔴 LIVE: ${station.name}`;
            track.author = "Radio Stream";
            track.isStream = true;

            // Clear queue and play immediately (Radio mode)
            player.queue.clear();
            player.stop();
            player.queue.add(track);
            player.play();

            const radioEmbed = new MessageEmbed()
                .setColor(station.color)
                .setAuthor({ name: "Radio Tuned", iconURL: client.config.iconURL })
                .setTitle(`📻 Now Playing: ${station.name}`)
                .setDescription(`Connected to live stream. Enjoy the vibes!`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            await interaction.editReply({ embeds: [radioEmbed] });
        }
    });

module.exports = command;
