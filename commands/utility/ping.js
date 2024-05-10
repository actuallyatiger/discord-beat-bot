const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with latency to the bot."),

  async execute(interaction) {
    await interaction.reply({
      content: `Latency: ${Math.abs(
        Date.now() - interaction.createdTimestamp
      )}`,
      ephemeral: true,
    });
  },
};
