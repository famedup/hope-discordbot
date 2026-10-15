/**
 * @file remind.js
 * @developer cashholy (carti)
 */

const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const remindersDb = require('../../../database/reminders');

const MAX_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_MS = 10 * 1000;

function parseTime(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

function formatDuration(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s) parts.push(`${s}s`);
    return parts.join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder for yourself')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('When to remind you (e.g. 10m, 2h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('What to remind you about')
                .setRequired(true)
        ),

    name: 'remind',
    aliases: ['reminder', 'remindme'],
    description: 'Set a reminder for yourself',
    category: 'general',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        const channelId = interactionOrMessage.channelId;
        const guildId = interactionOrMessage.guildId || null;

        function reply(container, ephemeral = false) {
            const flags = ephemeral
                ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                : MessageFlags.IsComponentsV2;
            return interactionOrMessage.reply({ components: [container], flags, allowedMentions: { users: [] } });
        }

        function errorContainer(text) {
            return new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(text)
                );
        }

        let timeStr, message;

        if (isSlash) {
            timeStr = interactionOrMessage.options.getString('time');
            message = interactionOrMessage.options.getString('message');
        } else {
            if (args.length < 2) {
                return reply(errorContainer('Please provide a time and a message.\n**Usage:** `remind <time> <message>`\n**Example:** `remind 30m Submit the report`'), true);
            }
            timeStr = args[0];
            message = args.slice(1).join(' ').trim();
        }

        const ms = parseTime(timeStr);

        if (!ms) {
            return reply(errorContainer('Invalid time format. Use a number followed by `s`, `m`, `h`, or `d`.\n**Examples:** `10m`, `2h`, `1d`'), true);
        }

        if (ms < MIN_MS) {
            return reply(errorContainer('Reminder must be at least **10 seconds** from now.'), true);
        }

        if (ms > MAX_MS) {
            return reply(errorContainer('Reminder cannot be more than **30 days** from now.'), true);
        }

        const triggerAt = Date.now() + ms;
        const formatted = formatDuration(ms);
        const timestamp = Math.floor(triggerAt / 1000);

        await remindersDb.addReminder(user.id, channelId, guildId, message, triggerAt);

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Reminder Set')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `I will remind you in **${formatted}** (<t:${timestamp}:R>).\n**Message:** ${message}`
                )
            );

        return reply(container);
    }
};
