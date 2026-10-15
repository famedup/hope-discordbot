// dev: cashholy (carti) | module: guildCreate

const {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const config = require('../settings');
const botLogger = require('../services/botLogger');

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        botLogger.logGuildJoin(guild, client).catch(() => {});

        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;

            const botName = client.user.username;
            const prefix = config.PREFIX;
            const inviteUrl =
                `https://discord.com/oauth2/authorize?client_id=${client.user.id}` +
                `&integration_type=0&scope=bot+applications.commands&permissions=2147551232`;

            // header: title on the left, bot avatar on the right
            const header = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Welcome aboard\n` +
                        `**${botName}** just joined **${guild.name}**.\n` +
                        `-# Sent to you because you own this server`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
                );

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addSectionComponents(header)
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Quick start**\n` +
                        `• Run \`/help\` or \`${prefix}help\` to browse every module\n` +
                        `• Not seeing a reply? Check that I can view and send messages in that channel`
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Need a hand?**\n` +
                        `Our support team is a click away, just hit the button below.`
                    )
                );

            const buttons = [];
            if (config.SUPPORT_SERVER) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel('Get Support')
                        .setStyle(ButtonStyle.Link)
                        .setURL(config.SUPPORT_SERVER)
                );
            }
            buttons.push(
                new ButtonBuilder()
                    .setLabel('Add to another server')
                    .setStyle(ButtonStyle.Link)
                    .setURL(inviteUrl)
            );

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addActionRowComponents(new ActionRowBuilder().addComponents(...buttons))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# ${guild.memberCount} members · thanks for trusting ${botName}`
                    )
                );

            await owner.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('guildCreate DM error:', error.message);
        }
    }
};
