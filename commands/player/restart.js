const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { Repeat } = require("../../utils/types");

module.exports = {
  data: new SlashCommandBuilder().setName("restart").setDescription("Restarts the current song"),

  async execute({ client, interaction }) {
    const client_channel = getVoiceConnection(interaction.guild.id);
    // Check if the user is in a voice channel
    if (!client_channel) {
      return interaction.reply({
        content: "The bot is not currently in a voice channel.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "You must be in a voice channel to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.member.voice.channelId !== client_channel.joinConfig.channelId) {
      return interaction.reply({
        content: "You must be in the same voice channel as the bot to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    const player = client.players[interaction.guild.id];

    if (!player) {
      return interaction.editReply({ content: "No queue currently exists" });
    }

    const repeatMode = player.repeat;
    player.setRepeatMode(Repeat.ONE);
    player.connection.becomeIdle();
    player.setRepeatMode(repeatMode);
  },
};
