const { Events } = require("discord.js");
const mainLogger = require("../logger");
const logger = mainLogger.child({ service: "discord" });

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
  },
};
