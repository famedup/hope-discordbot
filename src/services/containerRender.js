/*
 * Developed by cashholy (carti)
 * File: services/containerRender.js
 */

// Turns a saved container message (JSON) into sendable Components V2.
//
// Data shape (stored in custom_containers.data):
//   { containers: [ { color: int|null, spoiler: bool, blocks: [ block, ... ] }, ... ] }
//
// Blocks:
//   { id, type: 'text',      content }
//   { id, type: 'section',   content, accessory: { kind: 'thumbnail', url } | { kind: 'button', button } }
//   { id, type: 'separator', divider: bool, spacing: 'small' | 'large' }
//   { id, type: 'media',     items: [ { url, description? } ] }
//   { id, type: 'buttons',   buttons: [ button ] }                  (one row, up to 5)
// Button: { id, style, label?, emoji?, url?, action?, text?, roleId?, containerName? }

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { applyVars } = require('./embedVars');
const {
    NAME_RE, BUTTON_STYLES,
    isUrlOrVar, isUrl, isEmoji, parseColor, colorToHex, clean, newButtonId, roleProblem,
} = require('./embedRender');

const MAX_CONTAINERS_PER_GUILD = 25;  // saved containers per server
const MAX_CONTAINERS = 10;            // containers in one message (Discord limit)
const MAX_COMPONENTS = 40;            // Discord limit for one message, counted recursively
const MAX_TEXT_TOTAL = 4000;          // Discord limit for all text in one message
const MAX_MEDIA = 10;
const MAX_BLOCKS = 25;                // blocks in one container (a select menu holds 25)
const MAX_ROW_BUTTONS = 5;
const BASE_GREY = 0x2B2D31;           // the bot's own accent; user containers step off it so the per-server accent patch never recolours them

const COLORS = {
    none:    { label: 'None',    value: null },
    blurple: { label: 'Blurple', value: 0x5865F2 },
    green:   { label: 'Green',   value: 0x57F287 },
    yellow:  { label: 'Yellow',  value: 0xFEE75C },
    orange:  { label: 'Orange',  value: 0xE67E22 },
    red:     { label: 'Red',     value: 0xED4245 },
    blue:    { label: 'Blue',    value: 0x3498DB },
    white:   { label: 'White',   value: 0xFFFFFF },
    grey:    { label: 'Grey',    value: 0x2B2D32 },
};

const ACTIONS = {
    reply:       { label: 'Send a message',    hint: 'Private reply to the clicker' },
    container:   { label: 'Show a container',  hint: 'Private reply with a saved container' },
    role_add:    { label: 'Give a role',       hint: 'Adds a role to the clicker' },
    role_remove: { label: 'Remove a role',     hint: 'Removes a role from the clicker' },
    role_toggle: { label: 'Toggle a role',     hint: 'Adds it, or removes it if they have it' },
};

const BLOCK_TYPES = {
    text:      { label: 'Text',      hint: 'Markdown text' },
    section:   { label: 'Section',   hint: 'Text with a thumbnail or a button beside it' },
    separator: { label: 'Separator', hint: 'A divider line or blank space' },
    media:     { label: 'Gallery',   hint: 'Up to 10 images' },
    buttons:   { label: 'Buttons',   hint: 'A row of up to 5 buttons' },
};

/* ---------- data ---------- */

const newBlockId = newButtonId;
const newContainer = () => ({ color: null, spoiler: false, blocks: [] });
const emptyData = () => ({ containers: [newContainer()] });

/** Make sure a stored row has the expected shape. */
function normalize(data) {
    const d = data && typeof data === 'object' ? data : {};
    d.containers = Array.isArray(d.containers) && d.containers.length ? d.containers : [newContainer()];
    for (const c of d.containers) {
        c.blocks = Array.isArray(c.blocks) ? c.blocks : [];
        c.color = c.color ?? null;
        c.spoiler = !!c.spoiler;
    }
    return d;
}

/** Every button in a container, with where it lives. */
function* buttonsOf(container) {
    for (const b of container.blocks) {
        if (b.type === 'buttons') for (const btn of b.buttons ?? []) yield { block: b, button: btn };
        else if (b.type === 'section' && b.accessory?.kind === 'button' && b.accessory.button) yield { block: b, button: b.accessory.button };
    }
}

function findButton(data, buttonId) {
    for (const c of normalize(data).containers) {
        for (const hit of buttonsOf(c)) if (hit.button.id === buttonId) return hit.button;
    }
    return null;
}

/** Discord counts every nested component toward the 40 limit. */
function countBlock(b) {
    switch (b.type) {
        case 'section':   return 3;                                 // section + text + accessory
        case 'buttons':   return 1 + (b.buttons?.length ?? 0);      // row + buttons
        default:          return 1;
    }
}
const countContainer = (c) => 1 + c.blocks.reduce((n, b) => n + countBlock(b), 0);
const countComponents = (data) => normalize(data).containers.reduce((n, c) => n + countContainer(c), 0);

function textLength(data) {
    let n = 0;
    for (const c of normalize(data).containers) {
        for (const b of c.blocks) if (b.type === 'text' || b.type === 'section') n += (b.content ?? '').length;
    }
    return n;
}

/** Returns a user-facing problem, or null when the data fits Discord's limits. */
function validate(data) {
    const d = normalize(data);
    if (d.containers.length > MAX_CONTAINERS) return `A message can hold ${MAX_CONTAINERS} containers.`;
    if (d.containers.some(c => c.blocks.length > MAX_BLOCKS)) return `A container holds ${MAX_BLOCKS} blocks at most.`;
    if (countComponents(d) > MAX_COMPONENTS) return `Discord allows ${MAX_COMPONENTS} components per message (containers, text, buttons and rows all count). Remove something first.`;
    if (textLength(d) > MAX_TEXT_TOTAL) return `A message can hold ${MAX_TEXT_TOTAL} characters of text in total. Shorten something first.`;
    return null;
}

/* ---------- labels ---------- */

const cut = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function describeButton(b) {
    const style = BUTTON_STYLES[b.style]?.label ?? 'Grey';
    let does;
    if (b.style === 'link') does = cut(b.url, 40);
    else if (b.action === 'reply') does = 'sends a message';
    else if (b.action === 'container') does = `shows \`${b.containerName ?? '?'}\``;
    else if (b.action?.startsWith('role_')) does = `${ACTIONS[b.action].label.toLowerCase()} ${b.roleId ? `<@&${b.roleId}>` : ''}`.trim();
    else does = 'no action yet';
    return `${b.emoji ? `${b.emoji} ` : ''}**${cut(b.label, 30) || '(icon)'}** · ${style} · ${does}`;
}

function blockLabel(b, i) {
    const n = `${i + 1}.`;
    switch (b.type) {
        case 'text':      return `${n} Text · ${cut(b.content, 60) || 'empty'}`;
        case 'section':   return `${n} Section · ${cut(b.content, 50) || 'empty'}`;
        case 'separator': return `${n} Separator · ${b.divider ? 'line' : 'space'}, ${b.spacing}`;
        case 'media':     return `${n} Gallery · ${b.items?.length ?? 0} image${b.items?.length === 1 ? '' : 's'}`;
        case 'buttons':   return `${n} Buttons · ${(b.buttons ?? []).map(x => cut(x.label || x.emoji, 12)).join(', ') || 'none yet'}`;
        default:          return `${n} Unknown`;
    }
}

/* ---------- rendering ---------- */

function buildButton(b, rowId, ctx, inert = false) {
    const label = applyVars(b.label ?? '', ctx).slice(0, 80);
    if (!label && !b.emoji) return null;

    const btn = new ButtonBuilder();
    if (label) btn.setLabel(label);
    if (b.emoji) { try { btn.setEmoji(b.emoji); } catch (_) { /* bad emoji, skip */ } }

    if (b.style === 'link') {
        const url = applyVars(b.url ?? '', ctx).trim();
        if (!isUrl(url)) return null;
        return btn.setStyle(ButtonStyle.Link).setURL(url.slice(0, 512)).setDisabled(inert);
    }
    return btn
        .setStyle(BUTTON_STYLES[b.style]?.style ?? ButtonStyle.Secondary)
        .setCustomId(`cnbtn:${rowId}:${b.id}`)
        .setDisabled(inert);
}

const text = (s) => new TextDisplayBuilder().setContent(String(s).slice(0, 4000));

function buildOne(c, rowId, ctx, { placeholder = false, inert = false } = {}) {
    const box = new ContainerBuilder();
    if (c.color != null) box.setAccentColor(c.color === BASE_GREY ? BASE_GREY + 1 : c.color);
    if (c.spoiler) box.setSpoiler(true);
    let added = 0;

    for (const b of c.blocks) {
        if (b.type === 'text') {
            const t = applyVars(b.content ?? '', ctx).trim();
            if (!t) continue;
            box.addTextDisplayComponents(text(t)); added++;

        } else if (b.type === 'section') {
            const t = applyVars(b.content ?? '', ctx).trim();
            if (!t) continue;
            let accessory = null;
            if (b.accessory?.kind === 'button' && b.accessory.button) {
                accessory = buildButton(b.accessory.button, rowId, ctx, inert);
                if (accessory) { box.addSectionComponents(new SectionBuilder().addTextDisplayComponents(text(t)).setButtonAccessory(accessory)); added++; continue; }
            } else if (b.accessory?.kind === 'thumbnail') {
                const url = applyVars(b.accessory.url ?? '', ctx).trim();
                if (isUrl(url)) {
                    box.addSectionComponents(new SectionBuilder().addTextDisplayComponents(text(t)).setThumbnailAccessory(new ThumbnailBuilder().setURL(url)));
                    added++; continue;
                }
            }
            box.addTextDisplayComponents(text(t)); added++;   // accessory missing or invalid: keep the text

        } else if (b.type === 'separator') {
            box.addSeparatorComponents(new SeparatorBuilder()
                .setDivider(b.divider !== false)
                .setSpacing(b.spacing === 'large' ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small));
            added++;

        } else if (b.type === 'media') {
            const items = (b.items ?? [])
                .map(i => ({ url: applyVars(i.url ?? '', ctx).trim(), description: i.description }))
                .filter(i => isUrl(i.url)).slice(0, MAX_MEDIA);
            if (!items.length) continue;
            const gallery = new MediaGalleryBuilder();
            for (const i of items) {
                const it = new MediaGalleryItemBuilder().setURL(i.url);
                if (i.description) it.setDescription(applyVars(i.description, ctx).slice(0, 1024));
                gallery.addItems(it);
            }
            box.addMediaGalleryComponents(gallery); added++;

        } else if (b.type === 'buttons') {
            const btns = (b.buttons ?? []).slice(0, MAX_ROW_BUTTONS).map(x => buildButton(x, rowId, ctx, inert)).filter(Boolean);
            if (!btns.length) continue;
            box.addActionRowComponents(new ActionRowBuilder().addComponents(btns)); added++;
        }
    }

    if (!added) {
        if (!placeholder) return null;
        box.addTextDisplayComponents(text('-# Empty container. Add a component below.'));
    }
    return box;
}

/**
 * Build the top-level components for a saved container message.
 * @param row   Container DB row ({ id, name, data })
 * @param ctx   variable context ({ guild, user, member, channel })
 * @param opts  { preview: show a placeholder for empty containers, content: text above the containers,
 *               inert: disable every button (used for the live preview inside the builder) }
 * @returns array of builders, or null when there is nothing to show
 */
function renderContainers(row, ctx, { preview = false, content, inert = false } = {}) {
    const d = normalize(row.data);
    const out = [];
    const above = applyVars(content ?? '', ctx).trim();
    if (above) out.push(text(above));
    let any = false;
    for (const c of d.containers) {
        const box = buildOne(c, row.id, ctx, { placeholder: preview, inert });
        if (box) { out.push(box); any = true; }
    }
    return any ? out : null;
}

module.exports = {
    NAME_RE, MAX_CONTAINERS_PER_GUILD, MAX_CONTAINERS, MAX_COMPONENTS, MAX_TEXT_TOTAL, MAX_MEDIA, MAX_ROW_BUTTONS, MAX_BLOCKS,
    COLORS, BLOCK_TYPES, BUTTON_STYLES, ACTIONS, BASE_GREY,
    isUrlOrVar, isUrl, isEmoji, parseColor, colorToHex, clean, roleProblem,
    newBlockId, newButtonId, newContainer, emptyData, normalize, buttonsOf, findButton,
    countBlock, countContainer, countComponents, textLength, validate,
    cut, describeButton, blockLabel, renderContainers,
};
