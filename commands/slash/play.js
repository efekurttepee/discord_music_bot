const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const escapeMarkdown = require("discord.js").Util.escapeMarkdown;

const command = new SlashCommand()
  .setName("play")
  .setDescription(
    "Searches and plays the requested song \nSupports: \nYoutube, Spotify, Deezer, Apple Music"
  )
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("What am I looking for?")
      .setAutocomplete(true)
      .setRequired(true)
  )
  .setRun(async (client, interaction, options) => {
    let channel = await client.getChannel(client, interaction);
    if (!channel) {
      return;
    }

    let node = await client.getLavalink(client);
    if (!node) {
      return interaction.reply({
        embeds: [client.ErrorEmbed("Lavalink sunucusu bağlı değil")],
      });
    }

    let player = client.createPlayer(interaction.channel, channel);

    if (player.state !== "CONNECTED") {
      player.connect();
    }

    if (channel.type == "GUILD_STAGE_VOICE") {
      setTimeout(() => {
        if (interaction.guild.members.me.voice.suppress == true) {
          try {
            interaction.guild.members.me.voice.setSuppressed(false);
          } catch (e) {
            interaction.guild.members.me.voice.setRequestToSpeak(true);
          }
        }
      }, 2000); // Need this because discord api is buggy asf, and without this the bot will not request to speak on a stage - Darren
    }

    const ret = await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor(client.config.embedColor)
          .setDescription(":mag_right: **Aranıyor...**"),
      ],
      fetchReply: true,
    });

    const SpotifyResolver = require("../../lib/SpotifyResolver");
    const spotifyResolver = new SpotifyResolver(client);

    let query = options.getString("query", true);

    if (query.includes("spotify.com")) {
      await interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setColor(client.config.embedColor)
            .setDescription(":mag_right: **Spotify Linki Çözümleniyor...**"),
        ],
      });
      const result = await spotifyResolver.resolve(query);
      if (result.type === 'TRACK') {
        query = result.tracks[0];
      } else if (result.type === 'PLAYLIST') {
        // For now, just play the first track of the playlist as a simple fix
        query = result.tracks[0];
        // Ideally we would add all to queue, but let's get single track working first
      }
    }

    let res = await player.search(query, interaction.user).catch((err) => {
      client.error(err);
      return {
        loadType: "LOAD_FAILED",
      };
    });

    // Fallback System: If YouTube fails (LOAD_FAILED or NO_MATCHES), try SoundCloud
    if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
      console.log(`[DEBUG] YouTube validation failed for '${query}'. Retrying with SoundCloud...`);

      let scQuery = query.startsWith("scsearch:") ? query : `scsearch:${query}`;
      // If it was already a specific search, don't double prefix, but if it was raw text, add scsearch:

      let scRes = await player.search(scQuery, interaction.user).catch((err) => {
        return { loadType: "LOAD_FAILED" };
      });

      if (scRes.loadType !== "LOAD_FAILED" && scRes.loadType !== "NO_MATCHES") {
        res = scRes; // Use SoundCloud result if successful
      }
    }

    console.log(`[DEBUG] Query: ${query}`);
    console.log(`[DEBUG] Search Result LoadType: ${res.loadType}`);
    if (res.loadType === 'NO_MATCHES' || res.loadType === 'LOAD_FAILED') {
      console.log(`[DEBUG] Tracks found: ${res.tracks?.length || 0}`);
      if (res.exception) console.log(`[DEBUG] Exception: ${JSON.stringify(res.exception)}`);
    }

    if (res.loadType === "LOAD_FAILED") {
      if (!player.queue.current) {
        player.destroy();
      }
      await interaction
        .editReply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setDescription("Arama sırasında bir hata oluştu"),
          ],
        })
        .catch(this.warn);
    }

    if (res.loadType === "NO_MATCHES") {
      if (!player.queue.current) {
        player.destroy();
      }
      await interaction
        .editReply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setDescription("Sonuç bulunamadı"),
          ],
        })
        .catch(this.warn);
    }

    if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
      player.queue.add(res.tracks[0]);

      if (!player.playing && !player.paused && !player.queue.size) {
        player.play();
      }
      var title = escapeMarkdown(res.tracks[0].title);
      var title = title.replace(/\]/g, "");
      var title = title.replace(/\[/g, "");
      let addQueueEmbed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setAuthor({ name: "Kuyruğa eklendi", iconURL: client.config.iconURL })
        .setDescription(`[${title}](${res.tracks[0].uri})` || "Başlık Yok")
        .setURL(res.tracks[0].uri)
        .addFields(
          {
            name: "Ekleyen",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "Süre",
            value: res.tracks[0].isStream
              ? `\`CANLI 🔴 \``
              : `\`${client.ms(res.tracks[0].duration, {
                colonNotation: true,
                secondsDecimalDigits: 0,
              })}\``,
            inline: true,
          }
        );

      try {
        addQueueEmbed.setThumbnail(
          res.tracks[0].displayThumbnail("maxresdefault")
        );
      } catch (err) {
        addQueueEmbed.setThumbnail(res.tracks[0].thumbnail);
      }

      if (player.queue.totalSize > 1) {
        addQueueEmbed.addFields({
          name: "Kuyruk sırası",
          value: `${player.queue.size}`,
          inline: true,
        });
      } else {
        player.queue.previous = player.queue.current;
      }

      await interaction.editReply({ embeds: [addQueueEmbed] }).catch(this.warn);
    }

    if (res.loadType === "PLAYLIST_LOADED") {
      player.queue.add(res.tracks);

      if (
        !player.playing &&
        !player.paused &&
        player.queue.totalSize === res.tracks.length
      ) {
        player.play();
      }

      let playlistEmbed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setAuthor({
          name: "Çalma listesi kuyruğa eklendi",
          iconURL: client.config.iconURL,
        })
        .setThumbnail(res.tracks[0].thumbnail)
        .setDescription(`[${res.playlist.name}](${query})`)
        .addFields(
          {
            name: "Eklendi",
            value: `\`${res.tracks.length}\` şarkı`,
            inline: true,
          },
          {
            name: "Çalma listesi süresi",
            value: `\`${client.ms(res.playlist.duration, {
              colonNotation: true,
              secondsDecimalDigits: 0,
            })}\``,
            inline: true,
          }
        );

      await interaction.editReply({ embeds: [playlistEmbed] }).catch(this.warn);
    }

    if (ret) setTimeout(() => ret.delete().catch(this.warn), 20000);
    return ret;
  });

module.exports = command;
