// »» engineered by cashholy (carti) ««

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const autobumpDb = require('../../../../database/autobump');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const guild = interactionOrMessage.guild;
        const config = await autobumpDb.getConfig(guild.id);

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} No autobump configuration found! Use \`autobump setup\` first.`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const status = config.enabled ? `${emojis.enable} Enabled` : `${emojis.disable} Disabled`;
        const lastBump = config.lastBumpAt ? `<t:${Math.floor(config.lastBumpAt / 1000)}:R>` : 'Never';
        const messagePreview = config.message.length > 100
            ? config.message.substring(0, 100) + '...'
            : config.message;

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.timer} Autobump Configuration`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Status:** ${status}\n` +
                    `**Channel:** <#${config.channelId}>\n` +
                    `**Interval:** ${formatInterval(config.intervalMs)}\n` +
                    `**Delete After:** ${config.deleteAfterMs / 1000}s\n` +
                    `**Last Bump:** ${lastBump}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Message Preview:**\n\`\`\`${messagePreview}\`\`\``)
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};

function formatInterval(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}
