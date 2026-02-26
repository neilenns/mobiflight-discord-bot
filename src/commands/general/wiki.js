const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  DiscordjsError,
} = require("discord.js");
const { replyOrEditReply } = require("../../utilities");
const fs = require("fs");

const mainLogger = require("../../logger");
const logger = mainLogger.child({ service: "wiki" });

let selectMenu;
let menuItems;

// Creates a description from the first line of content by stripping markdown formatting
function createDescription(contentFirstLine) {
  let description = contentFirstLine;

  // Remove markdown links [text](url) -> text
  description = description.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove markdown formatting characters
  description = description.replace(/[*_~`#]/g, "");

  // Remove leading emojis (using common emoji ranges) and whitespace
  description = description.replace(/^[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/ug, "");

  return description.trim().substring(0, 100);
}

function loadMenuItems() {
  logger.debug(`Loading menu items from ${process.env.WIKI_ITEMS_PATH}`);
  try {
    menuItems = JSON.parse(
      fs.readFileSync(process.env.WIKI_ITEMS_PATH, "utf8")
    );

    // Build the menu
    selectMenu = new StringSelectMenuBuilder()
      .setCustomId("wiki-selector")
      .setPlaceholder("Select a wiki topic");

    menuItems.forEach((item) => {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(item.label)
        .setValue(item.value);

      // Use description field if present, otherwise generate from first line of content
      if (item.description) {
        option.setDescription(item.description);
      } else if (item.content && item.content.length > 0) {
        option.setDescription(createDescription(item.content[0]));
      }

      selectMenu.addOptions(option);
    });
  } catch (err) {
    logger.error(
      `Failed to load wiki menu items from ${process.env.WIKI_ITEMS_PATH}: ${err.message}`,
      err
    );
  }
}

async function watchForMenuChanges() {
  // Start watching for file changes
  try {
    const chokidar = (await import("chokidar")).default;
    chokidar
      .watch(process.env.WIKI_ITEMS_PATH, {
        awaitWriteFinish: true,
      })
      .on("change", loadMenuItems);
    logger.debug(`Watching for changes in ${process.env.WIKI_ITEMS_PATH}`);
  } catch (e) {
    logger.error(
      `Unable to watch for changes to ${process.env.WIKI_ITEMS_PATH}: ${e}`
    );
  }
}

// Prompts the user to pick a wiki topic from the dropdown.
// This function will throw an error if anything goes wrong.
async function promptForTopic(interaction) {
  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Send the menu
  const menu = await interaction.reply({
    content: "Select a topic",
    components: [row],
    ephemeral: true,
  });

  // Wait for the menu response
  const collectorFilter = (i) => i.user.id === interaction.user.id;

  const confirmation = await menu.awaitMessageComponent({
    filter: collectorFilter,
    time: 60_000,
  });

  return confirmation.values[0];
}

module.exports = {
  init: async () => {
    loadMenuItems();
    await watchForMenuChanges();
  },
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("wiki")
    .setDescription("Links to wiki topics")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("The name of the wiki topic to send")
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      // Check and see if a topic was provided on the command.
      let topic;
      topic = interaction.options.getString("topic") ?? null;

      if (topic === null) {
        topic = await promptForTopic(interaction);
      }

      // Find the selected item
      const selectedItem = menuItems.find((item) => item.value === topic);

      if (selectedItem === undefined) {
        await replyOrEditReply(interaction, {
          content: `No wiki entry for ${topic} found`,
          ephemeral: true,
        });
        return;
      }

      // Validate that the selected item has a non-empty content array
      if (
        !selectedItem.content ||
        !Array.isArray(selectedItem.content) ||
        selectedItem.content.length === 0
      ) {
        logger.error(
          `Selected wiki item "${topic}" has invalid or empty content`,
          { selectedItem }
        );
        await replyOrEditReply(interaction, {
          content: `No wiki content available for ${topic}`,
          ephemeral: true,
        });
        return;
      }
      // Build the message content from content array
      const messageContent = selectedItem.content.join("\n");

      await replyOrEditReply(interaction, {
        content: "Link sent!",
        components: [],
        ephemeral: true,
      });

      await interaction.channel.send({
        content: messageContent,
      });
    } catch (error) {
      // Errors from the user not responding to the dropdown in time don't log,
      // they're just too noisy.
      if (
        error instanceof DiscordjsError &&
        error.code === "InteractionCollectorError"
      ) {
        await replyOrEditReply(interaction, {
          content: `No response received, canceling sending the wiki link`,
          components: [],
          ephemeral: true,
        });
      } else {
        logger.error(`Unable to send wiki link: ${error}`, error);
        await replyOrEditReply(interaction, {
          content: `Unable to send wiki link: ${error}`,
          components: [],
          ephemeral: true,
        });
      }
    }
  },
};
