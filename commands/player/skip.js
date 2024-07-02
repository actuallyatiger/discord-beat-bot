const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { Repeat } = require("../../utils/types");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song"),

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

    if (player.queue.length() === 0) {
      return interaction.editReply({ content: "Cannot skip - the queue is empty" });
    }

    // enter idle state so the idle handler can play the next song
    // Temporarily set repeat mode to off to prevent the current song from being repeated
    const repeatMode = player.repeat;
    if (repeatMode === Repeat.ONE) {
      player.setRepeatMode(Repeat.ALL);
    }
    player.connection.becomeIdle();
    player.setRepeatMode(repeatMode);

    await interaction.editReply({ content: "Song skipped" });
  },
};
