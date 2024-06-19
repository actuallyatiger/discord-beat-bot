const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Player = require("../../utils/Player");

const { getVoiceConnection } = require("@discordjs/voice");

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
    const user_channel = interaction.member.voice.channelId;
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    }
    const client_channel = getVoiceConnection(interaction.guild.id);
    // Check if bot is currently in a voice channel, if so then the user must be in the same one
    if (client_channel && user_channel !== client_channel.joinConfig.channelId) {
      return interaction.reply({
        content: "You must be in the same voice channel as the bot to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query");

    if (!client.players[interaction.guild.id]) {
      client.players[interaction.guild.id] = new Player(user_channel, interaction.guild.id, client);
    }

    const player = client.players[interaction.guild.id];

    await player.add(query, interaction);
  },
};
