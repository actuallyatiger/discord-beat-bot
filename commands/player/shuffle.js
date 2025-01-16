const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle the queue"),

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

    if (player.queue.length < 2) {
      return interaction.editReply({ content: "There are not enough songs in the queue to shuffle." });
    }
    player.queue.shuffle();

    await interaction.editReply({ content: "Queue has been shuffled." });
  },
};
