// dev: cashholy (carti) | module: botinfo

const { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const config = require('../../../settings');
const i18n = require('../../../localization');

function formatUptime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

async function buildBotInfoContainer(client, guildId, tr = i18n.translatorFor('en')) {
    let prefix = config.PREFIX;
    if (guildId) {
        try {
            const { GuildPrefix } = require('../../../database/schemas');
            const customPrefix = await GuildPrefix.getPrefix(guildId);
            if (customPrefix) prefix = customPrefix;
        } catch (_) {}
    }

    const servers  = client.guilds.cache.size;
    const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const channels = client.channels.cache.size;
    const uptime   = tr.duration(client.uptime, { compact: true });
    const avatarURL = client.user.displayAvatarURL({ size: 256 });

    const overviewLines = [
        `- **${tr('botinfo.overview')}**`,
        `  - **${tr('botinfo.prefix')}:** \`${prefix}\``,
    ];
    if (config.OWNER_ID && /^\d+$/.test(config.OWNER_ID)) {
        overviewLines.push(`  - **${tr('botinfo.owner')}:** <@${config.OWNER_ID}>`);
    }
    overviewLines.push(`  - **${tr('botinfo.uptime')}:** \`${uptime}\``);

    const statsLines = [
        ``,
        `- **${tr('botinfo.stats')}**`,
        `  - **${tr('botinfo.servers')}:** ${tr.num(servers)}`,
        `  - **${tr('botinfo.users')}:** ${tr.num(users)}`,
        `  - **${tr('botinfo.channels')}:** ${tr.num(channels)}`,
    ];

    const content = overviewLines.concat(statsLines).join('\n');

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(content)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarURL)
                )
        );

    return container;
}

module.exports = {
    name: 'botinfo',
    description: "Shows the bot's info",
    aliases: ['bi'],

    async execute(message) {
        const container = await buildBotInfoContainer(message.client, message.guildId, i18n.translator(message));

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },

    buildBotInfoContainer,
};
