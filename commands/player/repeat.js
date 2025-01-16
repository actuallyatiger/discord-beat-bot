const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Toggle repeat mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("The repeat mode")
        .setRequired(true)
        .addChoices({ name: "Off", value: "off" }, { name: "All", value: "all" }, { name: "One", value: "one" })
    ),

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

    const player = client.players[interaction.guild.id];
    if (!player) {
      return interaction.reply({ content: "No player found.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const mode = interaction.options.getString("mode");

    player.setRepeatMode(mode);

    return interaction.editReply({ content: `Repeat mode set to ${mode}.` });
  },
};
