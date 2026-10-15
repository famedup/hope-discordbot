// @cashholy(carti) — containerSend

// Sending saved containers: /container send, the builder's Send button, {container:name} in welcome/farewell.

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Container } = require('../database/schemas');
const { renderContainers } = require('./containerRender');
const { applyVars } = require('./embedVars');

const TAG_RE = /\{container:([a-z0-9_-]{1,16})\}/i;

const findContainer = (guildId, name) =>
    Container.findOne({ where: { guildId, name: String(name).toLowerCase() } });

/**
 * Post a saved container message to a channel.
 * @param actor  GuildMember who triggered it (their channel permissions are checked); omit for automatic sends
 * @returns { ok, message?, error? }
 */
async function sendSavedContainer(channel, row, ctx, { content, actor } = {}) {
    if (!channel?.isTextBased?.() || !channel.guild) return { ok: false, error: 'I can\'t send messages there.' };

    const me = channel.guild.members.me;
    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        return { ok: false, error: `I need **View Channel** and **Send Messages** in <#${channel.id}>.` };
    }
    if (actor && !channel.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        return { ok: false, error: `You can't send messages in <#${channel.id}>.` };
    }

    const components = renderContainers(row, { ...ctx, channel }, { content });
    if (!components) return { ok: false, error: 'That container is empty. Add some content first.' };

    try {
        const message = await channel.send({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: ['users'] },
        });
        return { ok: true, message };
    } catch (err) {
        return { ok: false, error: `Discord rejected the message: ${err.message}` };
    }
}

/**
 * Welcome / farewell helper: if the text contains {container:name}, send that
 * container message (any other text sits above it). Returns true when handled.
 */
async function sendWithContainerTag(channel, text, ctx) {
    const match = text?.match(TAG_RE);
    if (!match) return false;

    const rest = applyVars(text.replace(TAG_RE, ''), ctx).trim();
    const row = await findContainer(channel.guild.id, match[1]);

    if (!row) {
        if (rest) await channel.send({ content: rest, allowedMentions: { parse: ['users'] } });
        return true;
    }

    const res = await sendSavedContainer(channel, row, ctx, { content: rest });
    if (!res.ok && rest) await channel.send({ content: rest, allowedMentions: { parse: ['users'] } }).catch(() => {});
    return true;
}

module.exports = { findContainer, sendSavedContainer, sendWithContainerTag, TAG_RE };
