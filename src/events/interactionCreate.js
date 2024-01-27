const { Events } = require("discord.js");
const mainLogger = require("../logger");
const logger = mainLogger.child({ service: "interactionCreate" });

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      loggers.error(
        `No command matching ${interaction.commandName} was found.`,
        { commandName: interaction.commandName }
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error.message);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  },
};
