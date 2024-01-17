const { replyOrEditReply } = require("../../utilities");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  hyperlink,
  hideLinkEmbed,
} = require("discord.js");
const chokidar = require("chokidar");
const fs = require("fs");
const debug = require("debug")("wikiCommand");

let selectMenu;
let menuItems;

function loadMenuItems() {
  debug(`Loading menu items from ${process.env.YT_ITEMS_PATH}`);
  menuItems = JSON.parse(fs.readFileSync(process.env.YT_ITEMS_PATH, "utf8"));

  // Build the menu
  selectMenu = new StringSelectMenuBuilder()
    .setCustomId("youtube-selector")
    .setPlaceholder("Select a YouTube video");

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
      .watch(process.env.YT_ITEMS_PATH, {
        awaitWriteFinish: true,
      })
      .on("change", loadMenuItems);
    debug(`Watching for changes in ${process.env.YT_ITEMS_PATH}`);
  } catch (e) {
    debug(`Unable to watch for changes to ${process.env.YT_ITEMS_PATH}: ${e}`);
  }
}

// Prompts the user to pick a wiki topic from the dropdown.
// This function will throw an error if anything goes wrong.
async function promptForTopic(interaction) {
  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Send the menu
  const menu = await interaction.reply({
    content: "Select a YouTube video",
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
    .setName("yt")
    .setDescription("Links to YouTube videos")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("The name of the YouTube video to send")
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
          content: `No YouTube entry for ${topic} found`,
          ephemeral: true,
        });
        return;
      }
      const link = hyperlink(selectedItem.description, selectedItem.href);

      await replyOrEditReply(interaction, {
        content: `Link sent!`,
        components: [],
        ephemeral: true,
      });

      await interaction.channel.send({
        content: `Check out this YouTube video for information: ${link}`,
      });
    } catch (error) {
      debug(`Unable to send YouTube link: ${error}`);
      await replyOrEditReply(interaction, {
        content: `Unable to send YouTube link: ${error}`,
        components: [],
        ephemeral: true,
      });
    }
  },
};
