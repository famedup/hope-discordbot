// ▛▀ cashholy (carti) ▀▜

const {
    WebhookClient,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require('discord.js');

const config     = require('../settings');
const logsConfig = require('../settings/logs');

let _client = null;

const _webhookCache = new Map(); // channelId → WebhookClient

function init(client) {
    _client = client;
}

async function resolveWebhook(channelId) {
    if (!channelId || !_client) return null;
    if (_webhookCache.has(channelId)) return _webhookCache.get(channelId);

    try {
        const channel = await _client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return null;

        const existing = await channel.fetchWebhooks().catch(() => null);
        let webhook = existing?.find(w => w.owner?.id === _client.user.id);

        if (!webhook) {
            webhook = await channel.createWebhook({ name: config.BOT_NAME + ' Logs' }).catch(() => null);
        }

        if (!webhook) return null;

        const wc = new WebhookClient({ id: webhook.id, token: webhook.token });
        _webhookCache.set(channelId, wc);
        return wc;
    } catch {
        return null;
    }
}

async function sendLog(channelId, logName, botName, botAvatarURL, container) {
    if (!channelId) return;
    try {
        const wh = await resolveWebhook(channelId);
        if (!wh) return;
        const payload = {
            username: `${botName} | ${logName}`,
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        };
        if (botAvatarURL) payload.avatarURL = botAvatarURL;
        await wh.send(payload);
    } catch (err) {
        console.error(`[BOT LOGGER] ${logName} failed:`, err.message);
    }
}

module.exports = {

    init,

    async logGuildJoin(guild, client) {
        try {
            const botName  = client.user.username;
            const botAvatar = client.user.displayAvatarURL({ size: 256 });
            const now      = Math.floor(Date.now() / 1000);
            const created  = Math.floor(guild.createdTimestamp / 1000);
            const owner    = await guild.fetchOwner().catch(() => null);
            const iconURL  = guild.iconURL({ dynamic: true, size: 256 });

            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Name:** ${guild.name}\n` +
                        `**ID:** \`${guild.id}\`\n` +
                        `**Members:** ${guild.memberCount.toLocaleString()}\n` +
                        `**Owner:** ${owner ? `${owner.user.username} (\`${owner.id}\`)` : 'Unknown'}\n` +
                        `**Created:** <t:${created}:D>`
                    )
                );

            if (iconURL) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL));

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Server Joined'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Joined <t:${now}:F>`));

            await sendLog(logsConfig.JOIN_LOGS, 'Join Logs', botName, botAvatar, container);
        } catch (err) {
            console.error('[BOT LOGGER] logGuildJoin error:', err.message);
        }
    },

    async logGuildLeave(guild, client) {
        try {
            const botName   = client.user.username;
            const botAvatar = client.user.displayAvatarURL({ size: 256 });
            const now       = Math.floor(Date.now() / 1000);
            const iconURL   = guild.iconURL({ dynamic: true, size: 256 });

            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Name:** ${guild.name}\n` +
                        `**ID:** \`${guild.id}\`\n` +
                        `**Members:** ${guild.memberCount.toLocaleString()}`
                    )
                );

            if (iconURL) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL));

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Server Left'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Left <t:${now}:F>`));

            await sendLog(logsConfig.LEAVE_LOGS, 'Leave Logs', botName, botAvatar, container);
        } catch (err) {
            console.error('[BOT LOGGER] logGuildLeave error:', err.message);
        }
    },

    logSlashCommand(interaction) {
        try {
            const client    = interaction.client;
            const botName   = client.user.username;
            const botAvatar = client.user.displayAvatarURL({ size: 256 });
            const now       = Math.floor(Date.now() / 1000);
            const userAvatar = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

            const optionsList = interaction.options?.data?.length
                ? interaction.options.data.map(o => `\`${o.name}: ${o.value ?? o.options?.map(s => `${s.name}: ${s.value}`).join(', ')}\``).join(' ')
                : 'None';

            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Command:** \`/${interaction.commandName}\`\n` +
                        `**Options:** ${optionsList}\n` +
                        `**User:** ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
                        `**Server:** ${interaction.guild?.name ?? 'DM'} (\`${interaction.guild?.id ?? 'N/A'}\`)\n` +
                        `**Channel:** ${interaction.channel ? `<#${interaction.channel.id}>` : 'Unknown'}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar));

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Slash Command'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Used <t:${now}:F>`));

            sendLog(logsConfig.SLASH_LOGS, 'Slash Logs', botName, botAvatar, container).catch(() => {});
        } catch (err) {
            console.error('[BOT LOGGER] logSlashCommand error:', err.message);
        }
    },

    logPrefixCommand(message, commandName, usedPrefix) {
        try {
            const client    = message.client;
            const botName   = client.user.username;
            const botAvatar = client.user.displayAvatarURL({ size: 256 });
            const now       = Math.floor(Date.now() / 1000);
            const userAvatar = message.author.displayAvatarURL({ dynamic: true, size: 256 });

            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Command:** \`${usedPrefix}${commandName}\`\n` +
                        `**User:** ${message.author.username} (\`${message.author.id}\`)\n` +
                        `**Server:** ${message.guild?.name ?? 'DM'} (\`${message.guild?.id ?? 'N/A'}\`)\n` +
                        `**Channel:** <#${message.channel.id}>`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar));

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Prefix Command'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Used <t:${now}:F>`));

            sendLog(logsConfig.PREFIX_LOGS, 'Prefix Logs', botName, botAvatar, container).catch(() => {});
        } catch (err) {
            console.error('[BOT LOGGER] logPrefixCommand error:', err.message);
        }
    },

    logDM(message) {
        try {
            const client    = message.client;
            const botName   = client.user.username;
            const botAvatar = client.user.displayAvatarURL({ size: 256 });
            const now       = Math.floor(Date.now() / 1000);
            const userAvatar = message.author.displayAvatarURL({ dynamic: true, size: 256 });

            const rawContent = message.content || '';
            const content    = rawContent.length > 900 ? rawContent.slice(0, 900) + '...' : rawContent || '*No text content*';

            const attachments = message.attachments.size
                ? message.attachments.map(a => `[${a.name}](${a.url})`).join(', ')
                : null;

            let body = `**User:** ${message.author.username} (\`${message.author.id}\`)\n**Message:** ${content}`;
            if (attachments) body += `\n**Attachments:** ${attachments}`;

            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar));

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Direct Message'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Received <t:${now}:F>`));

            sendLog(logsConfig.DM_LOGS, 'DM Logs', botName, botAvatar, container).catch(() => {});
        } catch (err) {
            console.error('[BOT LOGGER] logDM error:', err.message);
        }
    },

    async logError(error, context = 'Unknown', client = null) {
        try {
            const botName   = client?.user?.username ?? config.BOT_NAME;
            const botAvatar = client?.user?.displayAvatarURL({ size: 256 }) ?? null;
            const now       = Math.floor(Date.now() / 1000);

            const rawStack  = error.stack ?? String(error);
            const stack     = rawStack.split('\n').slice(0, 6).join('\n');
            const stackText = stack.length > 950 ? stack.slice(0, 950) + '...' : stack;

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Type:** \`${error.name ?? 'Error'}\`\n` +
                        `**Message:** ${error.message ?? 'No message'}\n` +
                        `**Context:** ${context}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`\`\`\`\n${stackText}\n\`\`\``)
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Occurred <t:${now}:F>`));

            await sendLog(logsConfig.ERROR_LOGS, 'Error Logs', botName, botAvatar, container);
        } catch (err) {
            console.error('[BOT LOGGER] logError itself failed:', err.message);
        }
    }
};
