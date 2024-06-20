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

    if (!client.players[interaction.guild.id]) {
      client.players[interaction.guild.id] = new Player(user_channel, interaction.guild.id, client);
    }

    const player = client.players[interaction.guild.id];

    await player.add(chip_id, interaction);
  },
};
