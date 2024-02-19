const dotenv = require("dotenv");
dotenv.config();

const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");

const mainLogger = require("./logger");
const logger = mainLogger.child({ service: "index" });

logger.info(`Starting up version ${process.env.VERSION ?? "dev"}`);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.cooldowns = new Collection();

function loadEvents() {
  try {
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      logger.debug(`Loading event: ${filePath}`, { file: filePath });
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
    }
  } catch (err) {
    logger.error(`Failed to load events: ${err.message}`, err);
  }
}

function loadCommands() {
  try {
    const foldersPath = path.join(__dirname, "commands");
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        logger.debug(`Loading command: ${filePath}`, { file: filePath });

        // Initialize the command if it has an initializer
        if ("init" in command) {
          logger.debug(`Initializing ${filePath}`, { file: filePath });
          command.init();
        }

        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
        } else {
          logger.warn(
            `The command at ${filePath} is missing a required "data" or "execute" property.`,
            { file: filePath }
          );
        }
      }
    }
  } catch (err) {
    logger.error(`Failed to load commands: ${err.message}`, err);
  }
}

if (process.env.ENABLE_COMMANDS === "true") {
  loadCommands();
} else {
  logger.info(`Commands disabled, skipping creating them.`);
}

loadEvents();

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
