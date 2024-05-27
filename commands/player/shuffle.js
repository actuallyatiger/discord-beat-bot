const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle the queue"),

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

    const queue = client.queues[interaction.guild.id];
    if (queue) {
      if (queue.length() === 0) {
        return interaction.editReply({ content: "No songs in the queue to shuffle" });
      } else {
        queue.shuffle();
        return interaction.editReply({ content: "Shuffled" });
      }
    } else {
      return interaction.editReply({ content: "No queue currently exists" });
    }
  },
};
