//
//  Made with care by cashholy (carti)
//

const {
  SlashCommandBuilder,
  REST,
  PermissionFlagsBits
} = require("discord.js");

const emojis = require('../../../media/emojis.json');

const rest = new REST({ version: "10" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Manage bot's server profile")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("avatar")
        .setDescription("Set the bot's avatar for this server")
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription("The avatar image")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("banner")
        .setDescription("Set the bot's banner for this server")
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription("The banner image")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bio")
        .setDescription("Set the bot's bio for this server")
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("The bio text")
            .setRequired(true)
            .setMaxLength(190)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("name")
        .setDescription("Set the bot's nickname for this server")
        .addStringOption(option =>
          option
            .setName("nickname")
            .setDescription("The nickname to set")
            .setRequired(true)
            .setMaxLength(32)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("resetprofile")
        .setDescription("Reset the bot's server profile to default")
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${emojis.error} You need the **Manage Server** permission to use this command!`,
        ephemeral: true
      });
    }

    rest.setToken(interaction.client.token);
    
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (subcommand === "avatar") {
        const attachment = interaction.options.getAttachment("image");
        
        if (!attachment.contentType?.startsWith("image/")) {
          return interaction.editReply({
            content: `${emojis.error} Please provide a valid image file!`
          });
        }

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { avatar: base64Data },
        });

        await interaction.editReply({
          content: `${emojis.success} Successfully updated server avatar!`
        });

      } else if (subcommand === "banner") {
        const attachment = interaction.options.getAttachment("image");
        
        if (!attachment.contentType?.startsWith("image/")) {
          return interaction.editReply({
            content: `${emojis.error} Please provide a valid image file!`
          });
        }

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { banner: base64Data },
        });

        await interaction.editReply({
          content: `${emojis.success} Successfully updated server banner!`
        });

      } else if (subcommand === "bio") {
        const bioText = interaction.options.getString("text");

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { bio: bioText },
        });

        await interaction.editReply({
          content: `${emojis.success} Successfully updated server bio!\n\n**New Bio:**\n${bioText}`
        });

      } else if (subcommand === "name") {
        const nickname = interaction.options.getString("nickname");

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { nick: nickname },
        });

        await interaction.editReply({
          content: `${emojis.success} Successfully updated server nickname to **${nickname}**!`
        });

      } else if (subcommand === "resetprofile") {
        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { 
            avatar: null,
            banner: null,
            bio: null,
            nick: null
          },
        });

        await interaction.editReply({
          content: `${emojis.success} Successfully reset server profile to default!`
        });
      }
    } catch (error) {
      console.error("Error updating server profile:", error);
      await interaction.editReply({
        content: `${emojis.error} An error occurred while updating the server profile. Please try again later.`
      });
    }
  }
};
