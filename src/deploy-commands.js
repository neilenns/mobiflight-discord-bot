const dotenv = require("dotenv");
dotenv.config();

const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const mainLogger = require("./logger");
const logger = mainLogger.child({ service: "deployCommands" });

const commands = [];
function loadCommands() {
  try {
    // Grab all the command folders from the commands directory you created earlier
    const foldersPath = path.join(__dirname, "commands");
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      // Grab all the command files from the commands directory you created earlier
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
      // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
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
  logger.warn(
    `Loading commands isn't enabled via the ENABLE_COMMANDS environment variable.`
  );
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
  try {
    logger.debug(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );

    logger.debug(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    logger.error(error.message);
  }
})();
