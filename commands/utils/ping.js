const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with latency to the bot"),

  async execute({ client, interaction }) {
    const sent = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
      flags: MessageFlags.Ephemeral,
    });
    await interaction.editReply({
      content: `Round-trip: ${
        sent.resource.message.createdTimestamp - interaction.createdTimestamp
      }ms | WS: ${Math.round(client.ws.ping)}ms`,
    });
  },
};
