/**
 * ┌ cashholy (carti)
 * └ services/embedRender.js
 */

// Turns a saved embed (JSON) into a sendable Discord message.

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const { applyVars } = require('./embedVars');

// One step off the bot's grey (0x2B2D31) so the per-server accent patch never recolours user embeds.
const DEFAULT_COLOR = 0x2B2D32;
const MAX_EMBEDS_PER_GUILD = 25;   // change this to raise / lower the per-server limit
const MAX_BUTTONS = 25;            // Discord hard limit (5 rows x 5)
const MAX_FIELDS = 25;             // Discord hard limit
const NAME_RE = /^[a-z0-9_-]{1,16}$/i;

const LIMITS = { title: 256, description: 4000, authorName: 256, footerText: 2048, fieldName: 256, fieldValue: 1024, total: 6000 };

const BUTTON_STYLES = {
    link:      { label: 'Link',    style: ButtonStyle.Link,      hint: 'Opens a website' },
    primary:   { label: 'Blurple', style: ButtonStyle.Primary,   hint: 'Blue action button' },
    secondary: { label: 'Grey',    style: ButtonStyle.Secondary, hint: 'Neutral action button' },
    success:   { label: 'Green',   style: ButtonStyle.Success,   hint: 'Green action button' },
    danger:    { label: 'Red',     style: ButtonStyle.Danger,    hint: 'Red action button' },
};

const BUTTON_ACTIONS = {
    reply:       { label: 'Send a message',  hint: 'Private reply to the clicker' },
    embed:       { label: 'Send an embed',   hint: 'Private reply with a saved embed' },
    role_add:    { label: 'Give a role',     hint: 'Adds a role to the clicker' },
    role_remove: { label: 'Remove a role',   hint: 'Removes a role from the clicker' },
    role_toggle: { label: 'Toggle a role',   hint: 'Adds it, or removes it if they have it' },
};

// Roles with these permissions can't be handed out by buttons.
const DANGEROUS_PERMS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.MentionEveryone,
];

/* ---------- validation helpers ---------- */

const URL_RE = /^https?:\/\/\S+$/i;
const SINGLE_VAR_RE = /^\{[a-z]+(?:\.[a-z]+)*\}$/i;
const EMOJI_RE = /^(<a?:\w{2,32}:\d{17,20}>|\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?|[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3)$/u;

/** A real URL, or a single variable such as {user.avatar}. */
function isUrlOrVar(value) {
    const v = (value ?? '').trim();
    return URL_RE.test(v) || SINGLE_VAR_RE.test(v);
}
function isUrl(value) {
    return URL_RE.test((value ?? '').trim());
}
function isEmoji(value) {
    return EMOJI_RE.test((value ?? '').trim());
}

/** "#5865F2" | "5865F2" | "#abc" -> int. Returns undefined when invalid. */
function parseColor(input) {
    let c = (input ?? '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(c)) c = c.split('').map(x => x + x).join('');
    if (!/^[0-9a-f]{6}$/i.test(c)) return undefined;
    return parseInt(c, 16);
}
function colorToHex(n) {
    return n == null ? '' : `#${n.toString(16).padStart(6, '0')}`;
}

/** Slash options are single-line, so let people type \n for a line break. */
function clean(text) {
    return (text ?? '').replace(/\\n/g, '\n').trim();
}

function newButtonId() {
    return Math.random().toString(36).slice(2, 8);
}

/* ---------- data ---------- */

function emptyData() {
    return { timestamp: false, fields: [], buttons: [] };
}

function rawLength(d) {
    return (d.title?.length ?? 0) + (d.description?.length ?? 0) +
        (d.author?.name?.length ?? 0) + (d.footer?.text?.length ?? 0) +
        (d.fields ?? []).reduce((n, f) => n + (f.name?.length ?? 0) + (f.value?.length ?? 0), 0);
}

/* ---------- rendering ---------- */

function buildButtons(embedId, data, ctx) {
    const rows = [];
    let row = new ActionRowBuilder();

    for (const b of (data.buttons ?? []).slice(0, MAX_BUTTONS)) {
        const label = applyVars(b.label ?? '', ctx).slice(0, 80);
        if (!label && !b.emoji) continue;

        const btn = new ButtonBuilder();
        if (label) btn.setLabel(label);
        if (b.emoji) { try { btn.setEmoji(b.emoji); } catch (_) {} }

        if (b.style === 'link') {
            const url = applyVars(b.url ?? '', ctx).trim();
            if (!isUrl(url)) continue;
            btn.setStyle(ButtonStyle.Link).setURL(url.slice(0, 512));
        } else {
            btn.setStyle(BUTTON_STYLES[b.style]?.style ?? ButtonStyle.Secondary)
               .setCustomId(`embtn:${embedId}:${b.id}`);
        }

        if (row.components.length === 5) { rows.push(row); row = new ActionRowBuilder(); }
        row.addComponents(btn);
    }
    if (row.components.length) rows.push(row);
    return rows;
}

/**
 * Build the message payload for a saved embed.
 * @param row   Embed DB row ({ id, name, data })
 * @param ctx   variable context ({ guild, user, member, channel })
 * @param opts  { preview: show a placeholder when empty, content: text above the embed }
 * @returns payload or null when the embed is empty
 */
function renderEmbed(row, ctx, { preview = false, content } = {}) {
    const d = row.data ?? emptyData();
    const v = s => applyVars(s ?? '', ctx);
    const embed = new EmbedBuilder().setColor(d.color ?? DEFAULT_COLOR);

    const title = v(d.title).slice(0, LIMITS.title);
    let description = v(d.description).slice(0, LIMITS.description);
    const authorName = v(d.author?.name).slice(0, LIMITS.authorName);
    const footerText = v(d.footer?.text).slice(0, LIMITS.footerText);
    const fields = (d.fields ?? []).slice(0, MAX_FIELDS).map(f => ({
        name: v(f.name).slice(0, LIMITS.fieldName) || '\u200b',
        value: v(f.value).slice(0, LIMITS.fieldValue) || '\u200b',
        inline: !!f.inline,
    }));

    // Discord rejects embeds over 6000 characters in total; trim the description to fit.
    const used = title.length + authorName.length + footerText.length +
        fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
    description = description.slice(0, Math.max(0, Math.min(description.length, LIMITS.total - used)));

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (authorName) {
        const icon = v(d.author.icon).trim();
        embed.setAuthor({ name: authorName, ...(isUrl(icon) && { iconURL: icon }) });
    }
    if (footerText) {
        const icon = v(d.footer.icon).trim();
        embed.setFooter({ text: footerText, ...(isUrl(icon) && { iconURL: icon }) });
    }
    if (fields.length) embed.addFields(fields);

    const image = v(d.image).trim();
    const thumb = v(d.thumbnail).trim();
    if (isUrl(image)) embed.setImage(image);
    if (isUrl(thumb)) embed.setThumbnail(thumb);
    if (d.timestamp) embed.setTimestamp();

    const filled = !!(title || description || authorName || footerText || fields.length || isUrl(image) || isUrl(thumb));
    if (!filled) {
        if (!preview) return null;
        embed.setDescription('*Nothing here yet. Pick **Text** from the menu below to begin.*');
    }

    const payload = { embeds: [embed], components: buildButtons(row.id, d, ctx) };
    const text = v(content).slice(0, 2000);
    if (text) payload.content = text;
    return payload;
}

/* ---------- permission helpers ---------- */

/** Returns an error string if a role can't safely be used on a button, else null. */
function roleProblem(guild, role, actor = null) {
    if (!role) return 'That role no longer exists.';
    if (role.id === guild.id) return 'You can\'t use @everyone.';
    if (role.managed) return 'That role is managed by an integration.';

    const me = guild.members.me;
    if (!me || role.position >= me.roles.highest.position) return 'That role is above my highest role.';
    if (role.permissions.has(DANGEROUS_PERMS)) return 'Roles with admin or moderation permissions can\'t be used on buttons.';

    if (actor && guild.ownerId !== actor.id && role.position >= actor.roles.highest.position) {
        return 'That role is above your highest role.';
    }
    return null;
}

module.exports = {
    DEFAULT_COLOR, MAX_EMBEDS_PER_GUILD, MAX_BUTTONS, MAX_FIELDS, NAME_RE, LIMITS,
    BUTTON_STYLES, BUTTON_ACTIONS,
    isUrlOrVar, isUrl, isEmoji, parseColor, colorToHex, clean, newButtonId,
    emptyData, rawLength, renderEmbed, roleProblem,
};
