const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  hyperlink,
  hideLinkEmbed,
} = require("discord.js");
const { replyOrEditReply } = require("../../utilities");
const chokidar = require("chokidar");
const fs = require("fs");
const debug = require("debug")("wikiCommand");

let selectMenu;
let menuItems;

function loadMenuItems() {
  debug(`Loading menu items from ${process.env.WIKI_ITEMS_PATH}`);
  menuItems = JSON.parse(fs.readFileSync(process.env.WIKI_ITEMS_PATH, "utf8"));

  // Build the menu
  selectMenu = new StringSelectMenuBuilder()
    .setCustomId("wiki-selector")
    .setPlaceholder("Select a wiki topic");

  menuItems.forEach((item) => {
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(item.label)
        .setDescription(item.description)
        .setValue(item.value)
    );
  });
}

function watchForMenuChanges() {
  // Start watching for file changes
  try {
    chokidar
      .watch(process.env.WIKI_ITEMS_PATH, {
        awaitWriteFinish: true,
      })
      .on("change", loadMenuItems);
    debug(`Watching for changes in ${process.env.WIKI_ITEMS_PATH}`);
  } catch (e) {
    debug(
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
  init: () => {
    loadMenuItems();
    watchForMenuChanges();
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

      const link = hyperlink(selectedItem.description, selectedItem.href);
      const preamble =
        selectedItem.preamble ??
        "Check out the following link for more information:";

      await replyOrEditReply(interaction, {
        content: `Link sent!`,
        components: [],
        ephemeral: true,
      });

      await interaction.channel.send({
        content: `${preamble} ${link}`,
      });
    } catch (error) {
      debug(`Unable to send wiki link: ${error}`);
      await replyOrEditReply(interaction, {
        content: `Unable to send wiki link: ${error}`,
        components: [],
        ephemeral: true,
      });
    }
  },
};
