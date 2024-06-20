const { EmbedBuilder } = require("discord.js");
const { AudioPlayerStatus, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const youtubesearchapi = require("youtube-search-api");
const ytdl = require("ytdl-core");
const Queue = require("./Queue");
const Connection = require("./Connection");

const link_re = /^(?:https?:\/\/)?(?:(?:www\.)?youtube\.com\/watch\?v=|youtu.be\/)(?<video_id>[\w-]{11})/;
const playlist_re =
  /^(?:https?:\/\/)?(?:(?:www\.)?youtube.com\/playlist\?list=|music.youtube.com\/playlist\?list=)(?<playlist_id>[\w-]{34})/;

const Repeat = Object.freeze({
  OFF: Symbol("off"),
  ALL: Symbol("all"),
  ONE: Symbol("one"),
});

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

  async add(query, interaction) {
    let from_playlist = false;
    let yt_id = "";
    // Check if the query is a video link
    if (link_re.test(query)) {
      const { video_id } = link_re.exec(query).groups;
      yt_id = video_id;
      this.queue.add(video_id);

      // Check if the query is a playlist link
    } else if (playlist_re.test(query)) {
      const { playlist_id } = playlist_re.exec(query).groups;
      yt_id = playlist_id;
      const playlist = await youtubesearchapi.GetPlaylistData(playlist_id);

      playlist.items.forEach((video) => {
        this.queue.add(video.id);
      });

      from_playlist = true;

      // Handle search query
    } else {
      try {
        const result = await youtubesearchapi.GetListByKeyword(query, false, 5);

        if (result.items.length === 0) {
          return interaction.editReply({ content: "No videos found with that query." });
        }
        yt_id = result.items[0].id;
        this.queue.add(yt_id);
      } catch (err) {
        return interaction.editReply({ content: "An error occurred while searching for videos." });
      }
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

    if (!from_playlist) {
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
            this.connection.destroy();
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
};
