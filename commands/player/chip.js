const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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

const chip_id = "WIRK_pGdIdA";

module.exports = {
  data: new SlashCommandBuilder().setName("chip").setDescription("Chip"),

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

    const description = "Chip";

    let queue = client.queues[interaction.guild.id];
    if (queue) {
      // add chip to the queue
      queue.add(chip_id);
    } else {
      queue = new Queue();
      client.queues[interaction.guild.id] = queue;

      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const stream = ytdl(chip_id, client.ytdl_options);
      // const stream = yt_dl(chip_id, client.ytdl_options, { stdio: ["ignore", "pipe", "ignore"] });
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

      const info = await ytdl.getInfo(chip_id);
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

      return interaction.editReply({ embeds: [embed] });
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
