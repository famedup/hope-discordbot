// [dev] cashholy (carti) :: modules/dual/autopost/subcommands/add.js

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ChannelType
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const autopostDb = require('../../../../database/autopost');
const { startAutopostTimer } = require('../autopostTimer');

const VALID_CATEGORIES = ['female', 'male', 'anime', 'random'];

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        let category, channel;

        if (isSlash) {
            category = interactionOrMessage.options.getString('category');
            channel = interactionOrMessage.options.getChannel('channel');
        } else {
            category = args[0]?.toLowerCase();
            const mention = args[1];
            const channelId = mention?.replace(/[<#>]/g, '');
            channel = channelId ? guild.channels.cache.get(channelId) : null;
        }

        if (!category || !VALID_CATEGORIES.includes(category)) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} Invalid category! Choose from: \`female\`, \`male\`, \`anime\`, \`random\``)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (!channel || !channel.isTextBased()) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} Please provide a valid text channel!`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        await autopostDb.setConfig({
            guildId: guild.id,
            category,
            channelId: channel.id
        });

        const client = interactionOrMessage.client;
        startAutopostTimer(client, guild.id, category, channel.id);

        const container = new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.success} Autopost Added`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Category:** ${category}\n` +
                    `**Channel:** <#${channel.id}>\n` +
                    `-# Posting 1 image every minute`
                )
            );

        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
