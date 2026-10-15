// [dev] cashholy (carti) :: modules/text/serverprofile/serverbanner.js

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
  name: "serverbanner",
  description: "Set the bot's banner for this server",
  aliases: ["sbanner"],

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
    const attachment = message.attachments.first();

    if (!attachment) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please attach an image to set as the server banner!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!attachment.contentType?.startsWith("image/")) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please provide a valid image file!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      const response = await fetch(attachment.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { banner: base64Data },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Successfully updated server banner!`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error updating server banner:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} An error occurred while updating the server banner. Please try again later.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
