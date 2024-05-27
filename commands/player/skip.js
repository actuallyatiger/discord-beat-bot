const { SlashCommandBuilder } = require("discord.js");
const { createAudioResource, StreamType, getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("ytdl-core");

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

    const queue = client.queues[interaction.guild.id];
    if (queue) {
      if (queue.length() > 0) {
        // Get the next song in the queue
        const next = queue.next();
        const next_stream = ytdl(next, client.ytdl_options);
        const next_resource = createAudioResource(next_stream, { inputType: StreamType.Arbitrary });

        // Play the next song
        queue.connection.player.play(next_resource);

        await interaction.editReply({ content: "Skipped" });
      } else {
        return interaction.editReply({ content: "No more songs to skip" });
      }
    } else {
      return interaction.editReply({ content: "No queue currently exists" });
    }
  },
};
