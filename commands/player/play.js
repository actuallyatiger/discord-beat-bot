const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const youtubesearchapi = require("youtube-search-api");
const ytdl = require("ytdl-core");
const Queue = require("../../utils/Queue");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
} = require("@discordjs/voice");

const link_re = /^(?:https?:\/\/)?(?:(?:www\.)?youtube\.com\/watch\?v=|youtu.be\/)(?<video_id>[\w-]{11})/;
const playlist_re =
  /^(?:https?:\/\/)?(?:(?:www\.)?youtube.com\/playlist\?list=|music.youtube.com\/playlist\?list=)(?<playlist_id>[\w-]{34})/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Search YouTube or provide a link")
    .addStringOption((option) => option.setName("query").setDescription("Search terms or link").setRequired(true)),

  async execute({ client, interaction }) {
    // Check if the user is in a voice channel
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    }
    const client_channel = getVoiceConnection(interaction.guild.id);
    // Check if bot is currently in a voice channel, if so then the user must be in the same one
    if (client_channel && interaction.member.voice.channelId !== client_channel.joinConfig.channelId) {
      return interaction.reply({
        content: "You must be in the same voice channel as the bot to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query");

    let video_id;
    let playlist_id;
    let playlist_ids = [];
    let description = "";
    let queue = client.queues[interaction.guild.id];
    let fromPlaylist = false;

    // Check if the query is a valid YouTube link
    if (link_re.test(query)) {
      const { video_id: linkVideoId } = link_re.exec(query).groups;
      video_id = linkVideoId;
    } else if (playlist_re.test(query)) {
      fromPlaylist = true;
      const { playlist_id: playlistId } = playlist_re.exec(query).groups;
      playlist_id = playlistId;

      playlist = await youtubesearchapi.GetPlaylistData(playlist_id);

      for (let item of playlist.items) {
        playlist_ids.push(item.id);
      }

      if (playlist_ids.length === 0) {
        return interaction.editReply({ content: "The playlist is empty." });
      }

      description = `Added ${playlist.items.length} videos to the queue`;
    } else {
      try {
        // Search for videos based on the query
        const result = await youtubesearchapi.GetListByKeyword(query, false, 5);

        if (result.items.length === 0) {
          return interaction.editReply({ content: "No videos found with that query." });
        }

        video_id = result.items[0].id;
      } catch (err) {
        return interaction.editReply({ content: "An error occurred while searching for videos." });
      }
    }

    // Validate the playlist/video ID
    if (fromPlaylist) {
      // filter out invalid video IDs
      playlist_ids = playlist_ids.filter((id) => ytdl.validateID(id));

      if (playlist_ids.length === 0) {
        return interaction.editReply({ content: "No valid videos found in the playlist." });
      }
    } else {
      if (!ytdl.validateID(video_id)) {
        return interaction.editReply({ content: "Could not find a video with that query" });
      }
    }

    if (queue) {
      // Add the playlist/video to the queue
      if (fromPlaylist) {
        queue.add(...playlist_ids);
      } else queue.add(video_id);
      description = `Added to queue in position ${queue.length()}`;
    } else {
      // Create a new queue and start playing the video
      queue = new Queue();
      client.queues[interaction.guild.id] = queue;

      if (fromPlaylist) {
        description = ` Playing ${playlist_ids.length} videos from the playlist`;
        video_id = playlist_ids.shift();
        queue.add(...playlist_ids);
      } else {
        description = "Playing now";
      }

      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const stream = ytdl(video_id, client.ytdl_options);
      const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

      player.play(resource);

      connection.subscribe(player);
      connection.player = player;
      queue.connection = connection;

      // Event handlers
      connection.player.on(AudioPlayerStatus.Idle, () => handleIdle({ connection, client, queue }));
      connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) =>
        handleDisconnect(oldState, newState, { connection, client, queue })
      );
    }

    try {
      let embed;
      // Get video information and send an embed message
      if (fromPlaylist) {
        const playlist = await youtubesearchapi.GetPlaylistData(playlist_id);
        const info = await ytdl.getInfo(playlist.items[0].id);
        embed = new EmbedBuilder()
          .setTitle("Playlist Added")
          .setURL(`https://www.youtube.com/playlist?list=${playlist_id}`)
          .setThumbnail(info.videoDetails.thumbnails[0].url)
          .setDescription(description);
      } else {
        const info = await ytdl.getInfo(video_id);
        embed = new EmbedBuilder()
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
      }
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: "An error occurred while trying to get the video information." });
    }
  },
};

// Handle idle state of the audio player
function handleIdle({ connection, client, queue }) {
  if (queue.length() > 0) {
    // Play the next song in the queue
    const next = queue.next();
    const next_stream = ytdl(next, client.ytdl_options);
    const next_resource = createAudioResource(next_stream, { inputType: StreamType.Arbitrary });

    connection.player.play(next_resource);
  } else {
    // No more songs to play, disconnect
    connection.destroy();
    delete queue;
  }
}

// Handle disconnection from the voice channel
async function handleDisconnect(oldState, newState, { connection, client, queue }) {
  try {
    await Promise.race([
      entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
      entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
    ]);
    // Seems to be reconnecting to a new channel - ignore disconnect
  } catch (error) {
    // Seems to be a real disconnect which SHOULDN'T be recovered from
    connection.destroy();
    delete queue;
  }
}
