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

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("wiki")
    .setDescription("Links to wiki topics"),
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(select);

    // Send the menu
    const menu = await interaction.reply({
      content: "Select a topic",
      components: [row],
      ephemeral: true,
    });

    // Wait for the menu response
    const collectorFilter = (i) => i.user.id === interaction.user.id;

    try {
      const confirmation = await menu.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });

      // Find the selected item
      const selectedItem = menuItems.find(
        (item) => item.value === confirmation.values[0]
      );

      const link = hyperlink(selectedItem.description, selectedItem.href);

      await interaction.channel.send({
        content: `Check out this wiki page for information: ${link}`,
      });
      await interaction.editReply({
        content: `Link sent!`,
        components: [],
        ephemeral: false,
      });
    } catch (e) {
      console.log(`Error: ${e}`);
      await interaction.editReply({
        content: "Confirmation not received within 1 minute, cancelling",
        components: [],
      });
    }
  },
};
