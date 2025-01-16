const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { ytapi } = require("../../utils/YouTubeAPI");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Get the songs in the queue"),

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

    if (player.queue.length() === 0) {
      return interaction.editReply({ content: "No songs in the queue" });
    }

    // get the songs from the queue, get the titles from ytdl and put them in an embed as a reponse
    const songs = player.queue.get();
    const description = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      // const song_info = await ytdl.getInfo(song);
      const song_info = await ytapi.getVideoInfo(song);
      description.push(`${i + 1}: ${song_info.title}`);
    }

    const embed = new EmbedBuilder()
      .setTitle("Queue")
      .setDescription(`Next ${songs.length} songs in the queue:\n${description.join("\n")}`)
      .setFooter({ text: `Total queue length: ${player.queue.length()} songs` });

    return interaction.editReply({ embeds: [embed] });
  },
};
