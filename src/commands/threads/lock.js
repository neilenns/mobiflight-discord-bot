const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Locks a thread")
    .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_THREADS),
  async execute(interaction) {
    const thread = interaction.channel;

    await interaction.reply({ content: "Thread is locked", ephemeral: true });
    thread.setLocked(true);
  },
};
