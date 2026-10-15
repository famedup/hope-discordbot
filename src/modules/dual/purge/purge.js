//
//  Made with care by cashholy (carti)
//

const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, MessageFlags
} = require('discord.js');
const { LoggingConfig, GuildConfig } = require('../../../database/schemas');

const LINK_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+/i;
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

function reply(ctx, text, ephemeral = false) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (ephemeral) opts.ephemeral = true;
    return ctx.reply(opts);
}

function buildFilter(type, targetUserId) {
    const twoWeeksAgo = Date.now() - TWO_WEEKS;
    const base = msg => msg.createdTimestamp > twoWeeksAgo && !msg.pinned;

    switch (type) {
        case 'user':
            return msg => base(msg) && msg.author.id === targetUserId;
        case 'bots':
            return msg => base(msg) && msg.author.bot;
        case 'humans':
            return msg => base(msg) && !msg.author.bot;
        case 'attachments':
            return msg => base(msg) && msg.attachments.size > 0;
        case 'links':
            return msg => base(msg) && LINK_REGEX.test(msg.content);
        case 'embeds':
            return msg => base(msg) && msg.embeds.length > 0;
        default:
            return base;
    }
}

async function bulkDeleteMessages(channel, amount, filterFn) {
    let totalDeleted = 0;
    let lastMessageId = null;
    const userCounts = new Map();
    const deletedLogs = [];
    let remaining = amount;

    while (remaining > 0) {
        const fetchOpts = { limit: Math.min(100, remaining + 10) };
        if (lastMessageId) fetchOpts.before = lastMessageId;

        const messages = await channel.messages.fetch(fetchOpts);
        if (messages.size === 0) break;

        lastMessageId = messages.last().id;

        const eligible = messages.filter(filterFn);
        const batch = [...eligible.values()].slice(0, remaining);
        if (batch.length === 0) {
            if (messages.size < fetchOpts.limit) break;
            continue;
        }

        for (const msg of batch) {
            const name = msg.author.username;
            userCounts.set(name, (userCounts.get(name) || 0) + 1);
            deletedLogs.push(`[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag} (${msg.author.id}): ${msg.content || '[No Content]'}`);
        }

        try {
            if (batch.length === 1) {
                await batch[0].delete();
                totalDeleted += 1;
            } else {
                const deleted = await channel.bulkDelete(batch, true);
                totalDeleted += deleted.size;
            }
        } catch {
            break;
        }

        remaining -= batch.length;
        if (messages.size < fetchOpts.limit) break;
        await new Promise(r => setTimeout(r, 500));
    }

    return { totalDeleted, userCounts, deletedLogs };
}

async function sendPurgeLog(logChannelId, guild, channel, totalDeleted, filterLabel, member, deletedLogs) {
    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;

    const logContent = [...deletedLogs].reverse().join('\n');
    const attachment = new AttachmentBuilder(
        Buffer.from(logContent, 'utf-8'),
        { name: `purge-log-${channel.name}-${Date.now()}.txt` }
    );

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Messages Purged'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Channel:** ${channel}\n**Amount:** ${totalDeleted}\n**Moderator:** ${member.user.tag}\n**Filter:** ${filterLabel}`
        ));

    await logChannel.send({
        components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages from the channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Number of messages to delete (1-500)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(500)
        )
        .addStringOption(opt =>
            opt.setName('filter')
                .setDescription('Filter messages to delete')
                .addChoices(
                    { name: 'Bots - Messages from bots', value: 'bots' },
                    { name: 'Humans - Messages from humans', value: 'humans' },
                    { name: 'Attachments - Messages with files/images', value: 'attachments' },
                    { name: 'Links - Messages containing links', value: 'links' },
                    { name: 'Embeds - Messages with embeds', value: 'embeds' },
                )
        )
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Only delete messages from this user')
        )
        .addStringOption(opt =>
            opt.setName('contains')
                .setDescription('Only delete messages containing this text')
        ),

    name: 'purge',
    aliases: ['clear', 'prune'],
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        const channel = interactionOrMessage.channel;
        const member = interactionOrMessage.member;

        if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
            return reply(interactionOrMessage, 'You need **Manage Messages** permission to use this command.', true);

        const botPerms = channel.permissionsFor?.(interactionOrMessage.guild.members.me);
        if (botPerms && !botPerms.has(PermissionFlagsBits.ManageMessages))
            return reply(interactionOrMessage, 'I need **Manage Messages** permission in this channel.', true);

        let amount, filterType = null, targetUserId = null, containsText = null;

        if (isSlash) {
            amount = interactionOrMessage.options.getInteger('amount');
            filterType = interactionOrMessage.options.getString('filter');
            const targetUser = interactionOrMessage.options.getUser('user');
            if (targetUser) {
                targetUserId = targetUser.id;
                filterType = 'user';
            }
            containsText = interactionOrMessage.options.getString('contains');
        } else {
            const validFilters = ['bots', 'humans', 'attachments', 'links', 'embeds'];
            for (const arg of args) {
                if (!amount && /^\d+$/.test(arg)) {
                    amount = parseInt(arg);
                } else if (!filterType && validFilters.includes(arg.toLowerCase())) {
                    filterType = arg.toLowerCase();
                } else if (!targetUserId && arg.match(/^<@!?(\d+)>$/)) {
                    targetUserId = arg.match(/^<@!?(\d+)>$/)[1];
                    filterType = 'user';
                } else if (!containsText) {
                    containsText = arg;
                }
            }
        }

        if (!amount || isNaN(amount) || amount < 1) {
            return reply(interactionOrMessage, [
                '### Purge',
                'Delete messages in bulk with optional filters.',
                '',
                '**Usage:** `purge <amount> [filter] [@user] [text]`',
                '**Filters:** `bots` `humans` `attachments` `links` `embeds`',
                '**Examples:**',
                '`purge 50` -- delete 50 messages',
                '`purge 100 bots` -- delete up to 100 bot messages',
                '`purge 20 @user` -- delete 20 messages from a user',
                '`purge 50 hello` -- delete messages containing "hello"',
                '',
                '-# Pinned messages are always skipped.',
            ].join('\n'), true);
        }

        amount = Math.min(amount, 500);

        if (!isSlash) {
            try { await interactionOrMessage.delete(); } catch {}
        } else {
            await interactionOrMessage.deferReply({ ephemeral: true });
        }

        let filterFn = buildFilter(filterType, targetUserId);

        if (containsText) {
            const lowerText = containsText.toLowerCase();
            const baseFn = filterFn;
            filterFn = msg => baseFn(msg) && msg.content.toLowerCase().includes(lowerText);
        }

        const { totalDeleted, userCounts, deletedLogs } = await bulkDeleteMessages(channel, amount, filterFn);

        if (totalDeleted > 0) {
            try {
                const [config, guildConfig] = await Promise.all([
                    LoggingConfig.findOne({ where: { guildId: interactionOrMessage.guildId } }),
                    GuildConfig.findOne({ where: { guildId: interactionOrMessage.guildId } })
                ]);
                if (guildConfig?.loggingEnabled && config) {
                    const logChannelId = config.messageBulkDeleteChannelId || config.messageEventsChannelId;
                    if (logChannelId) {
                        const label = filterType ? `${filterType}${targetUserId ? ` (${targetUserId})` : ''}` : 'None';
                        await sendPurgeLog(logChannelId, interactionOrMessage.guild, channel, totalDeleted, label, member, deletedLogs);
                    }
                }
            } catch {}
        }

        const sorted = [...userCounts.entries()].sort((a, b) => b[1] - a[1]);
        let breakdown = sorted.map(([name, count]) => `**${name}** : ${count}`).join('\n');
        if (!breakdown) breakdown = 'No messages matched the criteria.';

        const filterLabel = filterType
            ? `\n-# Filter: ${filterType}${containsText ? ` | Contains: "${containsText}"` : ''}`
            : (containsText ? `\n-# Contains: "${containsText}"` : '');

        const title = `### ${totalDeleted} Message${totalDeleted !== 1 ? 's' : ''} Deleted${filterLabel}`;

        if (isSlash) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(breakdown));
            await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(breakdown));
            const msg = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            setTimeout(() => { msg.delete().catch(() => {}); }, 5000);
        }
    }
};
