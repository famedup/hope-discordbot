// [dev] cashholy (carti) :: modules/dual/autobump/subcommands/enable.js

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
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

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

        if (config.enabled) {
            const container = new ContainerBuilder().setAccentColor(0xFEE75C)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.warning} Autobump is already enabled!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        
        await autobumpDb.updateEnabled(1, guild.id);

        
        const client = interactionOrMessage.client;
        startBumpTimer(client, guild.id, config);

        const container = new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.success} Autobump Enabled`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Channel:** <#${config.channelId}>\n` +
                    `**Interval:** ${formatInterval(config.intervalMs)}\n\n` +
                    `-# Messages will auto-delete after 1 minute`
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};

function startBumpTimer(client, guildId, config) {
    
    if (client.autobumpTimers?.has(guildId)) {
        clearInterval(client.autobumpTimers.get(guildId));
    }

    if (!client.autobumpTimers) {
        client.autobumpTimers = new Map();
    }

    const timer = setInterval(async () => {
        try {
            const currentConfig = await autobumpDb.getConfig(guildId);
            if (!currentConfig || !currentConfig.enabled) {
                clearInterval(timer);
                client.autobumpTimers.delete(guildId);
                return;
            }

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(currentConfig.channelId);
            if (!channel) return;

            const msg = await channel.send(currentConfig.message);
            await autobumpDb.updateLastBump(Date.now(), guildId);

            
            setTimeout(() => {
                msg.delete().catch(() => { });
            }, currentConfig.deleteAfterMs || 60000);

        } catch (error) {
            console.error(`Autobump error for guild ${guildId}:`, error);
        }
    }, config.intervalMs);

    client.autobumpTimers.set(guildId, timer);
}

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

module.exports.startBumpTimer = startBumpTimer;
