const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	DiscordjsError,
	hyperlink,
} = require('discord.js');
const { replyOrEditReply } = require('../../utilities');
const chokidar = require('chokidar');
const fs = require('fs');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'wiki' });

let selectMenu;
let menuItems;

function loadMenuItems() {
	logger.debug(`Loading menu items from ${process.env.WIKI_ITEMS_PATH}`);
	try {
		menuItems = JSON.parse(
			fs.readFileSync(process.env.WIKI_ITEMS_PATH, 'utf8'),
		);

		// Build the menu
		selectMenu = new StringSelectMenuBuilder()
			.setCustomId('wiki-selector')
			.setPlaceholder('Select a wiki topic');

		menuItems.forEach((item) => {
			const option = new StringSelectMenuOptionBuilder()
				.setLabel(item.label)
				.setValue(item.value);

			// Support both old format (description) and new format (content array)
			if (item.description) {
				option.setDescription(item.description);
			}
			else if (item.content && item.content.length > 0) {
				// For new format, use first line of content as description (up to 100 chars)
				// Strip markdown formatting: bold, italic, code, links, emojis, etc.
				let description = item.content[0];

				// Remove markdown links [text](url) -> text
				description = description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

				// Remove markdown formatting characters
				description = description.replace(/[*_~`#]/g, '');

				// Remove leading emojis (using common emoji ranges) and whitespace
				description = description.replace(/^[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/ug, '');

				description = description.trim().substring(0, 100);
				option.setDescription(description);
			}

			selectMenu.addOptions(option);
		});
	}
	catch (err) {
		logger.error(
			`Failed to load wiki menu items from ${process.env.WIKI_ITEMS_PATH}: ${err.message}`,
			err,
		);
	}
}

function watchForMenuChanges() {
	// Start watching for file changes
	try {
		chokidar
			.watch(process.env.WIKI_ITEMS_PATH, {
				awaitWriteFinish: true,
			})
			.on('change', loadMenuItems);
		logger.debug(`Watching for changes in ${process.env.WIKI_ITEMS_PATH}`);
	}
	catch (e) {
		logger.error(
			`Unable to watch for changes to ${process.env.WIKI_ITEMS_PATH}: ${e}`,
		);
	}
}

// Prompts the user to pick a wiki topic from the dropdown.
// This function will throw an error if anything goes wrong.
async function promptForTopic(interaction) {
	const row = new ActionRowBuilder().addComponents(selectMenu);

	// Send the menu
	const menu = await interaction.reply({
		content: 'Select a topic',
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
		.setName('wiki')
		.setDescription('Links to wiki topics')
		.addStringOption((option) =>
			option
				.setName('topic')
				.setDescription('The name of the wiki topic to send')
				.setRequired(false),
		),
	async execute(interaction) {
		try {
			// Check and see if a topic was provided on the command.
			let topic;
			topic = interaction.options.getString('topic') ?? null;

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

			// Build the message content based on format
			let messageContent;
			if (selectedItem.content) {
				// New format: use content array
				messageContent = selectedItem.content.join('\n');
			}
			else {
				// Legacy format: use preamble and href (for backward compatibility)
				const link = hyperlink(selectedItem.description, selectedItem.href);
				const preamble =
          selectedItem.preamble ??
          'Check out the following link for more information:';
				messageContent = `${preamble} ${link}`;
			}

			await replyOrEditReply(interaction, {
				content: 'Link sent!',
				components: [],
				ephemeral: true,
			});

			await interaction.channel.send({
				content: messageContent,
			});
		}
		catch (error) {
			// Errors from the user not responding to the dropdown in time don't log,
			// they're just too noisy.
			if (
				error instanceof DiscordjsError &&
        error.code === 'InteractionCollectorError'
			) {
				await replyOrEditReply(interaction, {
					content: 'No response received, canceling sending the wiki link',
					components: [],
					ephemeral: true,
				});
			}
			else {
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
