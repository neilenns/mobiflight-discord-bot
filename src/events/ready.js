const { Events } = require("discord.js");
const mainLogger = require("../logger");
const logger = mainLogger.child({ service: "discord" });

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
  },
};
