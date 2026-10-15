/**
 * @file embedSend.js
 * @developer cashholy (carti)
 */

// Sending saved embeds: /embed send, builder "Send", {embed:name} in welcome/farewell.

const { PermissionFlagsBits } = require('discord.js');
const { Embed } = require('../database/schemas');
const { renderEmbed } = require('./embedRender');
const { applyVars } = require('./embedVars');

const TAG_RE = /\{embed:([a-z0-9_-]{1,16})\}/i;

const findEmbed = (guildId, name) =>
    Embed.findOne({ where: { guildId, name: String(name).toLowerCase() } });

/**
 * Post a saved embed to a channel.
 * @param actor  GuildMember who triggered it (their channel permissions are checked); omit for automatic sends
 * @returns { ok, message?, error? }
 */
async function sendSavedEmbed(channel, row, ctx, { content, actor } = {}) {
    if (!channel?.isTextBased?.() || !channel.guild) return { ok: false, error: 'I can\'t send messages there.' };

    const me = channel.guild.members.me;
    const need = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
    if (!channel.permissionsFor(me)?.has(need)) {
        return { ok: false, error: `I need **View Channel**, **Send Messages** and **Embed Links** in <#${channel.id}>.` };
    }
    if (actor && !channel.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        return { ok: false, error: `You can't send messages in <#${channel.id}>.` };
    }

    const payload = renderEmbed(row, { ...ctx, channel }, { content });
    if (!payload) return { ok: false, error: 'That embed is empty. Add a title, description, image or footer first.' };

    try {
        const message = await channel.send({ ...payload, allowedMentions: { parse: ['users'] } });
        return { ok: true, message };
    } catch (err) {
        return { ok: false, error: `Discord rejected the message: ${err.message}` };
    }
}

/**
 * Welcome / farewell helper: if the text contains {embed:name}, send that embed
 * (any other text becomes the message above it). Returns true when handled.
 */
async function sendWithEmbedTag(channel, text, ctx) {
    const match = text?.match(TAG_RE);
    if (!match) return false;

    const rest = applyVars(text.replace(TAG_RE, ''), ctx).trim();
    const row = await findEmbed(channel.guild.id, match[1]);

    if (!row) {
        if (rest) await channel.send({ content: rest, allowedMentions: { parse: ['users'] } });
        return true;
    }

    const res = await sendSavedEmbed(channel, row, ctx, { content: rest });
    if (!res.ok && rest) await channel.send({ content: rest, allowedMentions: { parse: ['users'] } }).catch(() => {});
    return true;
}

module.exports = { findEmbed, sendSavedEmbed, sendWithEmbedTag, TAG_RE };
