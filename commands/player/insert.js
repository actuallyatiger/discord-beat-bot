const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("ytdl-core");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("insert")
    .setDescription("Insert a song into the queue")
    .addStringOption((option) => option.setName("query").setDescription("The song to insert").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("position").setDescription("The position to insert the song at").setMinValue(1).setRequired(true)
    ),

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

    const query = interaction.options.getString("query");
    const pos = interaction.options.getInteger("position");
    // check if pos is a valid position
    if (pos > player.queue.length() + 1) {
      return interaction.editReply({ content: "Invalid position" });
    }

    player.insert(pos, query, interaction);
  },
};
