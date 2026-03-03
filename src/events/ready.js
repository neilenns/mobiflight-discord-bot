const { Events } = require("discord.js");
const mainLogger = require("../logger");
const logger = mainLogger.child({ service: "discord" });
const { lockStaleThreads } = require("../functions/lockStaleThreads");

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);

    // Check for stale threads immediately on startup, then once every 24 hours.
    lockStaleThreads(client).catch((err) => {
      logger.error(`Failed to lock stale threads: ${err.message}`, err);
    });
    client.staleThreadInterval = setInterval(() => {
      lockStaleThreads(client).catch((err) => {
        logger.error(`Failed to lock stale threads: ${err.message}`, err);
      });
    }, TWENTY_FOUR_HOURS_IN_MS);
  },
};
