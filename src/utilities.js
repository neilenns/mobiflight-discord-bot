module.exports = {
  replyOrEditReply: async function replyOrEditReply(interaction, options) {
    if (interaction.replied) {
      await interaction.editReply(options);
    } else {
      await interaction.reply(options);
    }
  },
};
