// ─── cashholy (carti) · developer ───

const {
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const serverStats = require('../../../database/serverStats');
const { renderChart, renderOverviewCard, renderMessagesCard, COLORS } = require('../../../services/statsChart');
const emojis = require('../../../media/emojis.json');
const { hiddenChannelIds } = require('../../../services/statsScope');

const DAYS = 30;
const RANGE_LABEL = `Last ${DAYS} days`;

async function resolveMemberName(guild, userId) {
    const cached = guild.members.cache.get(userId);
    if (cached) return cached.displayName;
    try {
        const fetched = await guild.members.fetch(userId);
        return fetched.displayName;
    } catch {
        return 'Unknown User';
    }
}

function resolveChannelName(guild, channelId) {
    const channel = guild.channels.cache.get(channelId);
    return channel ? `#${channel.name}` : '#deleted-channel';
}

// Top channels that still exist and are public (hidden/deleted ones are skipped).
async function visibleTopChannels(guild, hidden, limit = 3) {
    const rows = await serverStats.getTopChannels(guild.id, DAYS, 25, hidden);
    return rows.filter(r => guild.channels.cache.has(r.channelId)).slice(0, limit);
}

async function buildMessagesView(guild, client) {
    const hidden = hiddenChannelIds(guild);
    const [d1, d7, d30, topMembersRaw, topChannelsRaw] = await Promise.all([
        serverStats.getMessageSum(guild.id, 1, hidden),
        serverStats.getMessageSum(guild.id, 7, hidden),
        serverStats.getMessageSum(guild.id, 30, hidden),
        serverStats.getTopMembers(guild.id, DAYS, 3, hidden),
        visibleTopChannels(guild, hidden),
    ]);

    const resolvedNames = new Map();
    for (const m of topMembersRaw) {
        resolvedNames.set(m.userId, await resolveMemberName(guild, m.userId));
    }

    const buffer = await renderMessagesCard({
        botName: client.user.username,
        botAvatarURL: client.user.displayAvatarURL({ size: 64 }),
        totals: { messages: [d1, d7, d30] },
        topMembers: topMembersRaw,
        topChannels: topChannelsRaw,
        resolveMemberName: (id) => resolvedNames.get(id) || 'Unknown User',
        resolveChannelName: (id) => resolveChannelName(guild, id),
        rangeLabel: RANGE_LABEL,
    });

    return { buffer, caption: `-# ${guild.name} • message analytics` };
}

async function buildOverviewView(guild, client) {
    const hidden = hiddenChannelIds(guild);
    const [msgRanges, reactRanges, voiceRanges, topChannelsRaw, series] = await Promise.all([
        Promise.all([1, 7, 30].map(d => serverStats.getMessageSum(guild.id, d, hidden))),
        Promise.all([1, 7, 30].map(d => serverStats.getReactionSum(guild.id, d))),
        Promise.all([1, 7, 30].map(d => serverStats.getVoiceSecondsSum(guild.id, d))),
        visibleTopChannels(guild, hidden),
        serverStats.getDailySeries(guild.id, DAYS, hidden),
    ]);

    const topChannels = topChannelsRaw.map(c => ({
        name: resolveChannelName(guild, c.channelId),
        value: Number(c.total).toLocaleString(),
        unit: 'messages',
    }));

    const buffer = await renderOverviewCard({
        botName: client.user.username,
        guildName: guild.name,
        guildIconURL: guild.iconURL({ size: 128 }) || null,
        memberCount: guild.memberCount,
        createdAt: guild.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        ranges: { messages: msgRanges, reactions: reactRanges, voice: voiceRanges },
        topChannels,
        series,
        lines: [
            { key: 'messages', color: COLORS.messages, label: 'Messages' },
            { key: 'reactions', color: COLORS.reactions, label: 'Reactions' },
            { key: 'voiceSeconds', color: COLORS.voice, label: 'Voice' },
        ],
        rangeLabel: RANGE_LABEL,
    });

    return { buffer, caption: `-# ${guild.name} • overview` };
}

async function buildActivityView(guild, client) {
    const series = await serverStats.getDailySeries(guild.id, DAYS, hiddenChannelIds(guild));

    const buffer = await renderChart({
        icon: '📈',
        title: 'Activity',
        botName: client.user.username,
        botAvatarURL: client.user.displayAvatarURL({ size: 64 }),
        series,
        lines: [
            { key: 'messages', color: COLORS.messages, label: 'Messages', formatTotal: (n) => n.toLocaleString() },
            { key: 'reactions', color: COLORS.reactions, label: 'Reactions', formatTotal: (n) => n.toLocaleString() },
            { key: 'voiceSeconds', color: COLORS.voice, label: 'Voice', formatTotal: (n) => `${Math.round(n / 60)}m` },
        ],
        rangeLabel: RANGE_LABEL,
    });

    return { buffer, caption: `-# ${guild.name} • activity over the last ${DAYS} days` };
}

async function buildMembershipView(guild, client) {
    const series = await serverStats.getDailySeries(guild.id, DAYS);

    const buffer = await renderChart({
        icon: '👥',
        title: 'Membership',
        botName: client.user.username,
        botAvatarURL: client.user.displayAvatarURL({ size: 64 }),
        series,
        lines: [
            { key: 'joins', color: COLORS.joins, label: 'Joins', formatTotal: (n) => n.toLocaleString() },
            { key: 'leaves', color: COLORS.leaves, label: 'Leaves', formatTotal: (n) => n.toLocaleString() },
        ],
        rangeLabel: RANGE_LABEL,
    });

    return { buffer, caption: `-# ${guild.name} • joins & leaves over the last ${DAYS} days` };
}

const VIEWS = {
    messages: { build: buildMessagesView, emojiKey: 'stats_messages', fallbackEmoji: '💬' },
    overview: { build: buildOverviewView, emojiKey: 'stats_overview', fallbackEmoji: '🗃️' },
    activity: { build: buildActivityView, emojiKey: 'stats_activity', fallbackEmoji: '📈' },
    membership: { build: buildMembershipView, emojiKey: 'stats_membership', fallbackEmoji: '👥' },
};
const VIEW_ORDER = ['messages', 'overview', 'activity', 'membership'];

function buildRow(activeView) {
    return new ActionRowBuilder().addComponents(
        VIEW_ORDER.map(key =>
            new ButtonBuilder()
                .setCustomId(`stats_view_${key}`)
                .setEmoji(emojis[VIEWS[key].emojiKey] || VIEWS[key].fallbackEmoji)
                .setStyle(key === activeView ? ButtonStyle.Primary : ButtonStyle.Secondary)
        )
    );
}

async function renderView(guild, client, view) {
    const { buffer, caption } = await VIEWS[view].build(guild, client);
    const attachment = new AttachmentBuilder(buffer, { name: 'stats.png' });
    return {
        content: caption,
        files: [attachment],
        components: [buildRow(view)],
    };
}

module.exports = {
    name: 'stats',
    description: "Shows the server's statistics",
    aliases: ['serverstats', 'statistics'],

    async execute(message) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        const payload = await renderView(message.guild, message.client, 'messages');
        const sent = await message.reply(payload);

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 5 * 60 * 1000,
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "This isn't your stats view.", ephemeral: true });
            }

            const view = interaction.customId.replace('stats_view_', '');
            if (!VIEWS[view]) return;

            await interaction.deferUpdate();
            const updated = await renderView(message.guild, message.client, view);
            await sent.edit(updated);
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                buildRow('none').components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            );
            await sent.edit({ components: [disabledRow] }).catch(() => {});
        });
    },
};
