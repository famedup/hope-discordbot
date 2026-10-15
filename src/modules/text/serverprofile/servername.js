/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  REST,
  PermissionFlagsBits
} = require("discord.js");

const emojis = require('../../../media/emojis.json');

const rest = new REST({ version: "10" });

module.exports = {
  name: "servername",
  description: "Set the bot's nickname for this server",
  aliases: ["snick", "servernick"],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} You need the **Manage Server** permission to use this command!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    rest.setToken(message.client.token);
    
    const guildId = message.guild.id;
    const nickname = args.join(" ");

    if (!nickname) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please provide a nickname!\n**Usage:** \`servername <nickname>\``)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (nickname.length > 32) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Nickname must be 32 characters or less! (Current: ${nickname.length})`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { nick: nickname },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Successfully updated server nickname to **${nickname}**!`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error updating server nickname:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} An error occurred while updating the server nickname. Please try again later.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
