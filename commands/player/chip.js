const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const Player = require("../../utils/Player");

const chip_url = "https://youtube.com/watch?v=WIRK_pGdIdA";

module.exports = {
  data: new SlashCommandBuilder().setName("chip").setDescription("Chip"),

  async execute({ client, interaction }) {
    // Check if the user is in a voice channel
    const user_channel = interaction.member.voice.channelId;
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "You must be in a voice channel to use this command.", ephemeral: true });
    }
    const client_channel = getVoiceConnection(interaction.guild.id);
    // Check if bot is currently in a voice channel, if so then the user must be in the same one
    if (client_channel && user_channel !== client_channel.joinConfig.channelId) {
      return interaction.reply({
        content: "You must be in the same voice channel as the bot to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    if (!client.players[interaction.guild.id]) {
      client.players[interaction.guild.id] = new Player(user_channel, interaction.guild.id, client);
    }

    const player = client.players[interaction.guild.id];

    await player.add(chip_url, interaction);
  },
};
