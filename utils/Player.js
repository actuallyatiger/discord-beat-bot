const { EmbedBuilder } = require("discord.js");
const { AudioPlayerStatus, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const youtubesearchapi = require("youtube-search-api");
const ytdl = require("ytdl-core");
const Queue = require("./Queue");
const Connection = require("./Connection");
const { Repeat } = require("./types");

const link_re = /^(?:https?:\/\/)?(?:(?:www\.)?youtube\.com\/watch\?v=|youtu.be\/)(?<video_id>[\w-]{11})/;
const playlist_re =
  /^(?:https?:\/\/)?(?:(?:www\.)?youtube.com\/playlist\?list=|music.youtube.com\/playlist\?list=)(?<playlist_id>[\w-]{34})/;

module.exports = class Player {
  constructor(channel_id, guild_id, client) {
    this.channel_id = channel_id;
    this.guild_id = guild_id;
    this.client = client;

    this.now_playing = null;

    this.repeat = Repeat.OFF;

    this.queue = new Queue();

    this.connection = null;
  }

  async getYTid(query, interaction) {
    if (link_re.test(query)) {
      return { id: link_re.exec(query).groups.video_id, type: "video" };
    }
    if (playlist_re.test(query)) {
      return { id: playlist_re.exec(query).groups.playlist_id, type: "playlist" };
    }
    try {
      const result = await youtubesearchapi.GetListByKeyword(query, false, 5);

      if (result.items.length === 0) {
        return interaction.editReply({ content: "No videos found with that query." });
      }
      return { id: result.items[0].id, type: "video" };
    } catch (err) {
      return interaction.editReply({ content: "An error occurred while searching for videos." });
    }
  }

  async add(query, interaction) {
    const { id: yt_id, type } = await this.getYTid(query, interaction);

    if (type === "video") {
      this.queue.add(yt_id);
    } else {
      const playlist = await youtubesearchapi.GetPlaylistData(yt_id);

      playlist.items.forEach((video) => {
        this.queue.add(video.id);
      });
    }

    let description = "";

    if (!this.connection) {
      this.connect(interaction);
      this.now_playing = this.queue.next();
      this.connection.play(this.now_playing);

      description = "Playing now";
    } else {
      description = "Added to queue";
    }

    const embed = new EmbedBuilder();

    if (type === "video") {
      const info = await ytdl.getInfo(yt_id);
      embed
        .setTitle(info.videoDetails.title)
        .setURL(info.videoDetails.video_url)
        .setThumbnail(info.videoDetails.thumbnails[0].url)
        .setDescription(description)
        .setFooter({
          text: `Duration: ${Math.floor(info.videoDetails.lengthSeconds / 60)}:${(
            "0" +
            (info.videoDetails.lengthSeconds % 60)
          ).slice(-2)}`,
        });
    } else {
      const playlist = await youtubesearchapi.GetPlaylistData(yt_id);
      const info = await ytdl.getInfo(playlist.items[0].id);
      embed
        .setTitle("Playlist Added")
        .setURL(`https://www.youtube.com/playlist?list=${yt_id}`)
        .setThumbnail(info.videoDetails.thumbnails[0].url)
        .setDescription(description)
        .setFooter({ text: `Number of videos: ${playlist.items.length}` });
    }

    interaction.editReply({ embeds: [embed] });
  }

  connect(interaction) {
    this.connection = new Connection(this.channel_id, this.guild_id, interaction);

    // Idle Audio Player
    this.connection.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      switch (this.repeat) {
        case Repeat.ONE:
          this.connection.play(this.now_playing);
          break;

        case Repeat.ALL:
          this.queue.add(this.now_playing);
          this.now_playing = this.queue.next();
          this.connection.play(this.now_playing);
          break;

        case Repeat.OFF:
          if (this.queue.length() > 0) {
            this.now_playing = this.queue.next();
            this.connection.play(this.now_playing);
          } else {
            try {
              this.connection.destroy();
            } catch {
              // Do nothing, already destroyed
            }
            delete this.client.players[this.guild_id];
          }
          break;
      }
    });

    // Handle disconnects
    this.connection.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Seems to be reconnecting to a new channel - ignore disconnect
      } catch (error) {
        // Seems to be a real disconnect which SHOULDN'T be recovered from
        try {
          this.connection.destroy();
        } catch {
          // Do nothing
        }
        delete this.client.players[this.guild_id];
      }
    });

    // Handle player errors
    this.connection.audioPlayer.on("error", (error) => {
      console.error(error);

      // Play the next song
      // Temporarily turn off repeat to prevent the now playing song from being readded to the queue
      const old_repeat = this.repeat;
      this.repeat = Repeat.OFF;
      this.connection.becomeIdle();
      this.repeat = old_repeat;
    });

    this.client.on("voiceStateUpdate", async (_, newState) => {
      // this.channel_id = newState.channelId || this.channel_id;

      // get the number of users in the voice channel, excluding the bot
      const voice_channel = await this.client.guilds.cache
        .get(this.guild_id)
        .channels.fetch(this.channel_id, { force: true });
      const count = voice_channel.members.size;
      if (count === 1) {
        try {
          this.connection.destroy();
        } catch {
          // Do nothing, already destroyed
        }
        delete this.client.players[this.guild_id];
      }
    });
  }

  pause() {
    return this.connection.audioPlayer.pause();
  }

  resume() {
    return this.connection.audioPlayer.unpause();
  }

  clearQueue() {
    this.queue.clear();
  }

  async insert(pos, query, interaction) {
    const { id: yt_id, type } = await this.getYTid(query, interaction);

    if (type === "video") {
      this.queue.insert(pos - 1, yt_id);
    } else {
      const playlist = await youtubesearchapi.GetPlaylistData(yt_id);
      const items = playlist.items.map((video) => video.id);

      this.queue.insert(pos - 1, ...items);
    }

    const embed = new EmbedBuilder();

    if (type === "video") {
      const info = await ytdl.getInfo(yt_id);
      embed
        .setTitle(info.videoDetails.title)
        .setURL(info.videoDetails.video_url)
        .setThumbnail(info.videoDetails.thumbnails[0].url)
        .setDescription(`Added to queue at position ${pos}`)
        .setFooter({
          text: `Duration: ${Math.floor(info.videoDetails.lengthSeconds / 60)}:${(
            "0" +
            (info.videoDetails.lengthSeconds % 60)
          ).slice(-2)}`,
        });
    } else {
      const playlist = await youtubesearchapi.GetPlaylistData(yt_id);
      const info = await ytdl.getInfo(playlist.items[0].id);
      embed
        .setTitle("Playlist Added")
        .setURL(`https://www.youtube.com/playlist?list=${yt_id}`)
        .setThumbnail(info.videoDetails.thumbnails[0].url)
        .setDescription(`Added to queue at position ${pos}`)
        .setFooter({ text: `Number of videos: ${playlist.items.length}` });
    }

    interaction.editReply({ embeds: [embed] });
  }

  async remove(pos, interaction) {
    const removed = this.queue.remove(pos - 1);

    const info = await ytdl.getInfo(removed[0]);
    const embed = new EmbedBuilder()
      .setTitle("Removed")
      .setDescription(info.videoDetails.title)
      .setURL(info.videoDetails.video_url)
      .setThumbnail(info.videoDetails.thumbnails[0].url);

    interaction.editReply({ embeds: [embed] });
  }

  setRepeatMode(mode) {
    switch (mode) {
      case "off":
        this.repeat = Repeat.OFF;
        break;
      case "all":
        this.repeat = Repeat.ALL;
        break;
      case "one":
        this.repeat = Repeat.ONE;
        break;
    }
  }
};
