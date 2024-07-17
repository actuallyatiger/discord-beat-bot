const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { ytapi } = require("../../utils/YouTubeAPI");

module.exports = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Get the currently playing song"),

  async execute({ client, interaction }) {
    const client_channel = getVoiceConnection(interaction.guild.id);
    // Check if the user is in a voice channel
    if (!client_channel) {
      return interaction.reply({ content: "The bot is not currently in a voice channel.", ephemeral: true });
    } else if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    } else if (interaction.member.voice.channelId !== client_channel.joinConfig.channelId) {
      return interaction.reply({
        content: "You must be in the same voice channel as the bot to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const player = client.players[interaction.guild.id];

    if (!player) {
      return interaction.editReply({ content: "No queue currently exists" });
    }

    if (!player.now_playing) {
      return interaction.editReply({ content: "No song currently playing" });
    }

    // const info = await ytdl.getInfo(player.now_playing);
    const info = await ytapi.getVideoInfo(player.now_playing);
    const embed = new EmbedBuilder()
      .setTitle("Now Playing")
      .setDescription(`[${info.title}](${`https://www.youtube.com/watch?v=${player.now_playing}`})`)
      .setThumbnail(info.thumbnail.url);

    return interaction.editReply({ embeds: [embed] });
  },
};
