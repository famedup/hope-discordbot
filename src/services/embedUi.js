// dev: cashholy (carti) | module: embedUi

// Builder screens for /embed.
// Every screen is one ephemeral message: header + live preview embed + controls.
// Look: text-only controls, a breadcrumb header, ✓ / ○ status marks.

const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const kit = require('./ui');
const { Embed } = require('../database/schemas');
const { variableGroups } = require('./embedVars');
const {
    renderEmbed, BUTTON_STYLES, BUTTON_ACTIONS, MAX_BUTTONS, MAX_FIELDS,
} = require('./embedRender');

const id = (action, embedId) => `emb:${action}:${embedId}`;
const mark = ok => (ok ? '✓' : '○');
const cut = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };

/* ---------- small helpers ---------- */

/** Standalone one-line reply (ephemeral). ok: true = success, false = error, null = neutral. */
function notice(text, ok = null) {
    const kind = ok === true ? 'success' : ok === false ? 'error' : 'base';
    return { components: [kit.notice(kind, text)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function btn(customId, label, style = ButtonStyle.Secondary, { disabled = false } = {}) {
    return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled);
}

const opt = (value, label, description, isDefault = false) => {
    const o = new StringSelectMenuOptionBuilder().setValue(value).setLabel(label).setDefault(isDefault);
    if (description) o.setDescription(String(description).slice(0, 100));
    return o;
};

const rowOf = (...components) => new ActionRowBuilder().addComponents(...components.flat());

/** "### name › Section" + dim subtitle. */
const header = (row, ...trail) =>
    `### ${[row.name, ...trail].join(' › ')}`;

/* ---------- drafts (a button / field being created or edited) ---------- */

const drafts = new Map();
const DRAFT_TTL = 15 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of drafts) if (now - v.ts > DRAFT_TTL) drafts.delete(k);
}, 60 * 1000).unref();

const key = (userId, embedId, kind) => `${userId}:${embedId}:${kind}`;
function getDraft(userId, embedId, kind = 'b') {
    const d = drafts.get(key(userId, embedId, kind));
    return d ? (d.ts = Date.now(), d) : null;
}
function setDraft(userId, embedId, state, kind = 'b') {
    const d = { ...state, ts: Date.now() };
    drafts.set(key(userId, embedId, kind), d);
    return d;
}
function clearDraft(userId, embedId, kind = 'b') {
    drafts.delete(key(userId, embedId, kind));
}

/* ---------- main screen ---------- */

function mainScreen(row, ctx, text = '') {
    const d = row.data ?? {};
    const nF = d.fields?.length ?? 0;
    const nB = d.buttons?.length ?? 0;
    const has = {
        text: !!(d.title || d.description),
        author: !!d.author?.name,
        footer: !!d.footer?.text,
        images: !!(d.image || d.thumbnail),
    };
    const empty = !has.text && !has.author && !has.footer && !has.images && !nF;

    const chips = [
        `${mark(has.text)} Text`,
        `${mark(has.author)} Author`,
        `${mark(has.footer)} Footer`,
        `${mark(has.images)} Images`,
        `${mark(nF)} Fields${nF ? ` ${nF}` : ''}`,
        `${mark(nB)} Buttons${nB ? ` ${nB}` : ''}`,
        `${mark(d.timestamp)} Timestamp`,
    ].join('   ');

    const menu = new StringSelectMenuBuilder()
        .setCustomId(id('menu', row.id))
        .setPlaceholder('Edit a section…')
        .addOptions(
            opt('basic', 'Text', 'Title, description and color'),
            opt('author', 'Author', 'Small name and icon above the title'),
            opt('footer', 'Footer', 'Small text and icon at the bottom'),
            opt('images', 'Images', 'Large image and corner thumbnail'),
            opt('fields', 'Fields', `Name and value blocks · ${nF}/${MAX_FIELDS}`),
            opt('buttons', 'Buttons', `Links, roles and replies · ${nB}/${MAX_BUTTONS}`),
            opt('timestamp', 'Timestamp', d.timestamp ? 'On · select to turn off' : 'Off · select to turn on'),
        );

    return {
        content: [
            header(row),
            `-# Saved automatically · use \`{embed:${row.name}}\` in welcome & farewell`,
            chips,
            empty ? '\n**Start with Text** in the menu below.' : '',
            text ? `\n${text}` : '',
        ].filter(s => s !== '').join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components: [
            rowOf(menu),
            rowOf(
                btn(id('send', row.id), 'Send', ButtonStyle.Primary),
                btn(id('prev', row.id), 'Preview'),
                btn(id('vars', row.id), 'Variables'),
                btn(id('close', row.id), 'Done'),
            ),
        ],
    };
}

/* ---------- send ---------- */

function sendScreen(row, ctx, channelId) {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(id('sendto', row.id))
        .setPlaceholder('Choose a channel…')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    if (channelId) select.setDefaultChannels(channelId);

    return {
        content: [header(row, 'Send'), '-# Pick where this embed should be posted'].join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components: [rowOf(select), rowOf(btn(id('home', row.id), 'Back'))],
    };
}

/* ---------- variables ---------- */

function variablesMessage() {
    const lines = variableGroups().flatMap(g => [
        `**${g.title}**`,
        ...g.items.map(i => `\`${i.tag}\` ${i.desc}`),
        '',
    ]);
    return {
        embeds: [kit.embed({
            title: 'Variables',
            description: [
                'Use these in any text, field or button.',
                'Image and icon links accept one variable, like `{user.avatar}`.',
                'In slash commands, type `\\n` for a new line.',
                '',
                ...lines,
            ].join('\n').slice(0, 4000),
        })],
        flags: MessageFlags.Ephemeral,
    };
}

/* ---------- fields ---------- */

function fieldsScreen(row, ctx, text = '') {
    const fields = row.data.fields ?? [];
    const list = fields.length
        ? fields.map((f, i) => `\`${i + 1}\` **${cut(f.name, 40) || '—'}**${f.inline ? '  ·  inline' : ''}\n-# ${cut(f.value, 70)}`).join('\n')
        : '*No fields yet. Fields are name and value blocks, handy for stats, rules or info.*';

    const components = [];
    if (fields.length) {
        components.push(rowOf(
            new StringSelectMenuBuilder()
                .setCustomId(id('fsel', row.id))
                .setPlaceholder('Edit a field…')
                .addOptions(fields.map((f, i) => opt(f.id, `${i + 1}. ${cut(f.name, 80) || 'Field'}`, cut(f.value, 90)))),
        ));
    }
    components.push(rowOf(
        btn(id('fadd', row.id), 'Add field', ButtonStyle.Primary, { disabled: fields.length >= MAX_FIELDS }),
        btn(id('home', row.id), 'Back'),
    ));

    return {
        content: [header(row, 'Fields'), `-# ${fields.length}/${MAX_FIELDS} fields`, '', list, text ? `\n${text}` : ''].join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components,
    };
}

function fieldProblem(d) {
    if (!d.name) return 'Add a name.';
    if (!d.value) return 'Add a value.';
    return null;
}

function fieldSetupScreen(row, ctx, state, text = '') {
    const d = state.draft;
    const fields = row.data.fields ?? [];
    const index = fields.findIndex(f => f.id === state.editingId);
    const problem = fieldProblem(d);

    const layout = new StringSelectMenuBuilder()
        .setCustomId(id('flayout', row.id))
        .setPlaceholder('Layout')
        .addOptions(
            opt('inline', 'Inline', 'Sits beside other inline fields', !!d.inline),
            opt('full', 'Full width', 'Takes its own row', !d.inline),
        );

    const components = [
        rowOf(layout),
        rowOf(
            btn(id('fdet', row.id), 'Edit text'),
            btn(id('fsave', row.id), 'Save', ButtonStyle.Success, { disabled: !!problem }),
            btn(id('fcancel', row.id), 'Cancel'),
        ),
    ];
    if (state.editingId) {
        components.push(rowOf(
            btn(id('fup', row.id), 'Move up', ButtonStyle.Secondary, { disabled: index <= 0 }),
            btn(id('fdown', row.id), 'Move down', ButtonStyle.Secondary, { disabled: index < 0 || index >= fields.length - 1 }),
            btn(id('fdel', row.id), 'Delete', ButtonStyle.Danger),
        ));
    }

    return {
        content: [
            header(row, 'Fields', state.editingId ? `Field ${index + 1}` : 'New field'),
            `${mark(d.name)} Name   ${d.name ? `\`${cut(d.name, 60)}\`` : '*not set*'}`,
            `${mark(d.value)} Value   ${d.value ? `\`${cut(d.value, 80)}\`` : '*not set*'}`,
            `Layout   ${d.inline ? 'Inline' : 'Full width'}`,
            problem ? `-# ${problem}` : '-# Ready to save.',
            text ? `\n${text}` : '',
        ].filter(s => s !== '').join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components,
    };
}

/* ---------- buttons ---------- */

function describeButton(b) {
    const kind = b.style === 'link'
        ? `link · ${cut(b.url, 40)}`
        : `${BUTTON_STYLES[b.style]?.label.toLowerCase() ?? 'button'} · ${(BUTTON_ACTIONS[b.action]?.label ?? 'no action').toLowerCase()}` +
          (b.roleId ? ` <@&${b.roleId}>` : '') + (b.embedName ? ` \`${b.embedName}\`` : '');
    return `**${cut(b.label, 30) || b.emoji || '—'}**  ·  ${kind}`;
}

function buttonsScreen(row, ctx, text = '', confirmClear = false) {
    const buttons = row.data.buttons ?? [];
    const list = buttons.length
        ? buttons.map((b, i) => `\`${i + 1}\` ${describeButton(b)}`).join('\n')
        : '*No buttons yet. Add link buttons, or buttons that give roles and send replies.*';

    const components = [];
    if (buttons.length) {
        components.push(rowOf(
            new StringSelectMenuBuilder()
                .setCustomId(id('bsel', row.id))
                .setPlaceholder('Edit or remove a button…')
                .addOptions(buttons.map((b, i) =>
                    opt(b.id, `${i + 1}. ${cut(b.label || b.emoji || 'Button', 80)}`,
                        b.style === 'link' ? 'Link button' : BUTTON_ACTIONS[b.action]?.label ?? 'Button'))),
        ));
    }
    components.push(rowOf(
        btn(id('badd', row.id), 'Add button', ButtonStyle.Primary, { disabled: buttons.length >= MAX_BUTTONS }),
        confirmClear
            ? btn(id('bclearok', row.id), 'Confirm clear', ButtonStyle.Danger)
            : btn(id('bclear', row.id), 'Clear all', ButtonStyle.Secondary, { disabled: !buttons.length }),
        btn(id('home', row.id), 'Back'),
    ));

    return {
        content: [header(row, 'Buttons'), `-# ${buttons.length}/${MAX_BUTTONS} buttons`, '', list, text ? `\n${text}` : ''].join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components,
    };
}

/** Is the draft ready to save? Returns a hint or null. */
function draftProblem(d) {
    if (!d.label && !d.emoji) return 'Add a label or emoji.';
    if (d.style === 'link') return d.url ? null : 'Add a URL.';
    if (!d.action) return 'Choose what the button does.';
    if (d.action === 'reply' && !d.text) return 'Add the message to reply with.';
    if (d.action === 'embed' && !d.embedName) return 'Choose an embed to send.';
    if (d.action.startsWith('role_') && !d.roleId) return 'Choose a role.';
    return null;
}

async function setupScreen(row, ctx, state, text = '') {
    const d = state.draft;
    const isLink = d.style === 'link';
    const components = [];

    components.push(rowOf(
        new StringSelectMenuBuilder()
            .setCustomId(id('bstyle', row.id))
            .setPlaceholder('Button style')
            .addOptions(Object.entries(BUTTON_STYLES).map(([k, s]) => opt(k, s.label, s.hint, d.style === k))),
    ));

    let needsTarget = null; // 'role' | 'embed' | null
    if (!isLink) {
        components.push(rowOf(
            new StringSelectMenuBuilder()
                .setCustomId(id('bact', row.id))
                .setPlaceholder('When clicked…')
                .addOptions(Object.entries(BUTTON_ACTIONS).map(([k, a]) => opt(k, a.label, a.hint, d.action === k))),
        ));

        if (d.action?.startsWith('role_')) {
            needsTarget = 'role';
            const roleMenu = new RoleSelectMenuBuilder()
                .setCustomId(id('brole', row.id))
                .setPlaceholder('Choose a role…')
                .setMinValues(1).setMaxValues(1);
            if (d.roleId) roleMenu.setDefaultRoles(d.roleId);
            components.push(rowOf(roleMenu));
        } else if (d.action === 'embed') {
            needsTarget = 'embed';
            const others = (await Embed.findAll({ where: { guildId: row.guildId }, order: [['name', 'ASC']] }))
                .filter(e => e.id !== row.id).slice(0, 25);
            if (others.length) {
                components.push(rowOf(
                    new StringSelectMenuBuilder()
                        .setCustomId(id('bemb', row.id))
                        .setPlaceholder('Choose an embed…')
                        .addOptions(others.map(e => opt(e.name, e.name, null, d.embedName === e.name))),
                ));
            } else {
                text = [text, 'You need another saved embed first. Make one with `/embed create`.'].filter(Boolean).join('\n');
            }
        }
    }

    const problem = draftProblem(d);
    const actions = rowOf(
        btn(id('bdet', row.id), isLink ? 'Label & link' : 'Label & details'),
        btn(id('bsave', row.id), 'Save', ButtonStyle.Success, { disabled: !!problem }),
    );
    if (state.editingId) actions.addComponents(btn(id('bdel', row.id), 'Delete', ButtonStyle.Danger));
    actions.addComponents(btn(id('bcancel', row.id), 'Cancel'));
    components.push(actions);

    // checklist
    const style = BUTTON_STYLES[d.style];
    const lines = [
        `${mark(true)} Style   ${style.label}`,
        `${mark(d.label || d.emoji)} Label   ${d.label ? `\`${cut(d.label, 40)}\`` : '*not set*'}${d.emoji ? `  ${d.emoji}` : ''}`,
    ];
    if (isLink) {
        lines.push(`${mark(d.url)} Link   ${d.url ? `\`${cut(d.url, 60)}\`` : '*not set*'}`);
    } else {
        lines.push(`${mark(d.action)} Action   ${BUTTON_ACTIONS[d.action]?.label ?? '*not set*'}`);
        if (needsTarget === 'role') lines.push(`${mark(d.roleId)} Role   ${d.roleId ? `<@&${d.roleId}>` : '*not set*'}`);
        if (needsTarget === 'embed') lines.push(`${mark(d.embedName)} Embed   ${d.embedName ? `\`${d.embedName}\`` : '*not set*'}`);
        if (d.action === 'reply') lines.push(`${mark(d.text)} Message   ${d.text ? `\`${cut(d.text, 60)}\`` : '*not set*'}`);
    }

    return {
        content: [
            header(row, 'Buttons', state.editingId ? 'Edit button' : 'New button'),
            ...lines,
            problem ? `-# ${problem}` : '-# Ready to save.',
            text ? `\n${text}` : '',
        ].filter(s => s !== '').join('\n'),
        embeds: renderEmbed(row, ctx, { preview: true }).embeds,
        components,
    };
}

module.exports = {
    id, notice, btn,
    getDraft, setDraft, clearDraft, draftProblem, fieldProblem,
    mainScreen, sendScreen, variablesMessage,
    fieldsScreen, fieldSetupScreen,
    buttonsScreen, setupScreen,
};
