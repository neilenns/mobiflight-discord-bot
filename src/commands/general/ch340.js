const { replyOrEditReply } = require("../../utilities");
const { SlashCommandBuilder, hyperlink } = require("discord.js");
const debug = require("debug")("ch340Command");

module.exports = {
  init: () => {},
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ch340")
    .setDescription("Provides information about counterfeit CH340 chips"),
  async execute(interaction) {
    try {
      const link = hyperlink(
        "Arduino Nano and Mega with CH340 chips connection issues",
        "https://www.badcasserole.com/arduino-nano-with-ch340-chips-connection-issues/"
      );

      await interaction.channel.send({
        content: `It sounds like your Arduino uses a counterfeit CH340 chip. You can find more information about this problem and how to fix it by visiting this blog post: ${link}.`,
      });

      await replyOrEditReply(interaction, {
        content: `Blog link sent!`,
        components: [],
        ephemeral: true,
      });
    } catch (error) {
      debug(`Unable to send CH340 information: ${error}`);
      await replyOrEditReply(interaction, {
        content: `Unable to send CH340 information: ${error}`,
        components: [],
        ephemeral: true,
      });
    }
  },
};
