const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  hyperlink,
  hideLinkEmbed,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const menuItemsPath = path.join(__dirname, "../../menuItems.json");
const menuItems = JSON.parse(fs.readFileSync(menuItemsPath, "utf8"));

// Build the menu
const select = new StringSelectMenuBuilder()
  .setCustomId("wiki-selector")
  .setPlaceholder("Select a wiki topic");

// Add options from the JSON file
menuItems.forEach((item) => {
  select.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel(item.label)
      .setDescription(item.description)
      .setValue(item.value)
  );
});

// Prompts the user to pick a wiki topic from the dropdown.
// This function will throw an error if anything goes wrong.
async function promptForTopic(interaction) {
  const row = new ActionRowBuilder().addComponents(select);

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

async function replyOrEditReply(interaction, options) {
  if (interaction.replied) {
    await interaction.editReply(options);
  } else {
    await interaction.reply(options);
  }
}

module.exports = {
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

      await replyOrEditReply(interaction, {
        content: `Link sent!`,
        components: [],
        ephemeral: true,
      });

      await interaction.channel.send({
        content: `Check out this wiki page for information: ${link}`,
      });
    } catch (error) {
      console.log(`Unable to send wiki link: ${error}`);
      await replyOrEditReply(interaction, {
        content: `Unable to send wiki link: ${error}`,
        components: [],
        ephemeral: true,
      });
    }
  },
};
