const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const youtubesearchapi = require("youtube-search-api");
const ytdl = require("ytdl-core");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const Queue = require("../../utils/Queue");

const link_re = /^(?:https?:\/\/)?(?:(?:www\.)?youtube.com\/watch\?v=|youtu.be\/)(?<video_id>[\w-]{11})/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Search YouTube or provide a link")
    .addStringOption((option) => option.setName("query").setDescription("Search terms or link").setRequired(true)),

  async execute({ client, interaction }) {
    if (!interaction.member.voice.channel) {
      await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    }

    interaction.deferReply();

    const query = interaction.options.getString("query");
    // const embed = null;

    if (link_re.test(query)) {
      const { video_id } = link_re.exec(query).groups;

      if (ytdl.validateID(video_id)) {
        let description = "";

        if (client.queues[interaction.guild.id]) {
          client.queues[interaction.guild.id].push(video_id);
          description = "Added to queue in position " + client.queues[interaction.guild.id].queue.length;
        } else {
          client.queues[interaction.guild.id] = new Queue();
          description = "Playing now";

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
          client.queues[interaction.guild.id].connection = connection;

          connection.player.on(AudioPlayerStatus.Idle, () => {
            if (client.queues[interaction.guild.id].queue.length > 0) {
              const next = client.queues[interaction.guild.id].queue.shift();
              const next_stream = ytdl(next, client.ytdl_options);
              const next_resource = createAudioResource(next_stream, { inputType: StreamType.Arbitrary });

              connection.player.play(next_resource);
            } else {
              connection.destroy();
              delete client.queues[interaction.guild.id];
            }
          });

          connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log("Disconnected");
            connection.destroy();
            console.log("Destroyed");
            delete client.queues[interaction.guild.id];
          });
        }

        ytdl
          .getInfo(video_id)
          .then(async (info) => {
            const embed = new EmbedBuilder()
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
            await interaction.editReply({ embeds: [embed] });
          })
          .catch(async (err) => {
            console.error(err);
            await interaction.editReply({ content: "An error occured while trying to get the video information." });
          });
      } else {
        await interaction.editReply({ content: `Could not find a video with the URL: ${query}` });
      }
    } else {
      youtubesearchapi.GetListByKeyword(query, false, 5).then(async (result) => {
        if (result.items.length === 0) {
          await interaction.editReply({ content: "No videos found with that query." });
          return;
        }

        const video_id = result.items[0].id;
        if (ytdl.validateID(video_id)) {
          let description = "";

          if (client.queues[interaction.guild.id]) {
            client.queues[interaction.guild.id].push(video_id);
            description = "Added to queue in position " + client.queues[interaction.guild.id].queue.length;
          } else {
            client.queues[interaction.guild.id] = new Queue();
            description = "Playing now";

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
            client.queues[interaction.guild.id].connection = connection;

            connection.player.on(AudioPlayerStatus.Idle, () => {
              if (client.queues[interaction.guild.id].queue.length > 0) {
                const next = client.queues[interaction.guild.id].queue.shift();
                const next_stream = ytdl(next, client.ytdl_options);
                const next_resource = createAudioResource(next_stream, { inputType: StreamType.Arbitrary });

                connection.player.play(next_resource);
              } else {
                connection.destroy();
                delete client.queues[interaction.guild.id];
              }
            });

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
              console.log("Disconnected");
              connection.destroy();
              delete client.queues[interaction.guild.id];
            });
          }
          ytdl
            .getInfo(video_id)
            .then(async (info) => {
              const embed = new EmbedBuilder()
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
              await interaction.editReply({ embeds: [embed] });
            })
            .catch(async (err) => {
              console.error(err);
              await interaction.editReply({ content: "An error occured while trying to get the video information." });
            });
        } else {
          await interaction.editReply({ content: `Could not find a video with the URL: ${query}` });
        }
      });
    }
  },
};
