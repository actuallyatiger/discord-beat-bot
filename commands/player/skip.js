const { SlashCommandBuilder } = require("discord.js");
const ytdl = require("ytdl-core");
const { createAudioResource, StreamType } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song"),

  async execute({ client, interaction }) {
    if (!interaction.member.voice.channel) {
      await interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    }

    await interaction.deferReply();

    if (client.queues[interaction.guild.id]) {
      if (client.queues[interaction.guild.id].queue.length > 0) {
        const next = client.queues[interaction.guild.id].queue.shift();
        const next_stream = ytdl(next, client.ytdl_options);
        const next_resource = createAudioResource(next_stream, { inputType: StreamType.Arbitrary });

        const connection = client.queues[interaction.guild.id].connection;

        connection.player.play(next_resource);

        await interaction.editReply({ content: "Skipped" });
      } else {
        await interaction.editReply({ content: "No more songs to skip" });
      }
    } else {
      await interaction.editReply({ content: "No queue currently exists" });
    }
  },
};
