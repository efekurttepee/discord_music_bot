const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");

const quizSongs = [
    {
        url: "https://www.youtube.com/watch?v=fHI8X4OXluQ",
        title: "Blinding Lights",
        answers: ["blinding lights", "the weeknd"]
    },
    {
        url: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
        title: "Shape of You",
        answers: ["shape of you", "ed sheeran"]
    },
    {
        url: "https://www.youtube.com/watch?v=DyDfgMOUjCI",
        title: "Bad Guy",
        answers: ["bad guy", "billie eilish"]
    },
    {
        url: "https://www.youtube.com/watch?v=OPf0YbXqDm0",
        title: "Uptown Funk",
        answers: ["uptown funk", "mark ronson", "bruno mars"]
    },
    {
        url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
        title: "Despacito",
        answers: ["despacito", "luis fonsi"]
    },
    {
        url: "https://www.youtube.com/watch?v=q0hyYWKXF0Q",
        title: "Dance Monkey",
        answers: ["dance monkey", "tones and i"]
    },
    {
        url: "https://www.youtube.com/watch?v=09R8_2nJtjg",
        title: "Sugar",
        answers: ["sugar", "maroon 5"]
    },
    {
        url: "https://www.youtube.com/watch?v=hT_nvWreIhg",
        title: "Counting Stars",
        answers: ["counting stars", "onerepublic"]
    }
];

const command = new SlashCommand()
    .setName("quiz")
    .setDescription("Start a music guessing game!")
    .setRun(async (client, interaction, options) => {
        let channel = await client.getChannel(client, interaction);
        if (!channel) return;

        let node = await client.getLavalink(client);
        if (!node) {
            return interaction.reply({
                embeds: [client.ErrorEmbed("Lavalink node is not connected")],
            });
        }

        // Pick random song
        const song = quizSongs[Math.floor(Math.random() * quizSongs.length)];

        let player = client.createPlayer(interaction.channel, channel);
        if (player.state !== "CONNECTED") player.connect();

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor("YELLOW")
                    .setTitle("🎉 Music Quiz Started!")
                    .setDescription("I'm playing a random song. **Guess the name or artist!**\n\n(Type your answer in this chat)")
                    .setFooter({ text: "You have 30 seconds!" })
            ],
            fetchReply: true,
        });

        // Play the song
        let res = await player.search(song.url, interaction.user);
        if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
            player.queue.add(res.tracks[0]);
            player.play();
        } else {
            return interaction.editReply("Could not load quiz song. Try again.");
        }

        // Collector
        const filter = (m) => !m.author.bot;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000 });

        let answered = false;

        collector.on('collect', m => {
            const guess = m.content.toLowerCase();
            if (song.answers.some(ans => guess.includes(ans))) {
                answered = true;
                collector.stop();

                player.stop();
                player.queue.clear();

                m.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor("GREEN")
                            .setTitle("🏆 Correct!")
                            .setDescription(`**${m.author.username}** guessed it right!\nThe song was: **${song.title}**`)
                    ]
                });
            }
        });

        collector.on('end', collected => {
            if (!answered) {
                player.stop();
                player.queue.clear();
                interaction.followUp({
                    embeds: [
                        new MessageEmbed()
                            .setColor("RED")
                            .setTitle("⌛ Time's up!")
                            .setDescription(`Nobody guessed it correctly.\nThe song was: **${song.title}**`)
                    ]
                });
            }
        });
    });

module.exports = command;
