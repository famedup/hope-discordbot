/**
 * ┌ cashholy (carti)
 * └ services/containerUi.js
 */

// Builder screens for /container.
// One ephemeral message: live preview (every container in the message) + one control card.
// The control card changes with `state.mode`; everything is saved to the database as you go.

const {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const kit = require('./ui');
const { variableGroups } = require('./embedVars');
const R = require('./containerRender');

const V2 = MessageFlags.IsComponentsV2;
const id = (action, rowId) => `cnb:${action}:${rowId}`;
const PREVIEW_BUDGET = R.MAX_COMPONENTS - 15;   // the control card uses at most 15 components

/* ---------- per-user builder state ---------- */

const states = new Map();
const TTL = 30 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of states) if (now - v.ts > TTL) states.delete(k);
}, 60 * 1000).unref();

const key = (userId, rowId) => `${userId}:${rowId}`;

function getState(userId, rowId) {
    let st = states.get(key(userId, rowId));
    if (!st) st = { mode: 'main', ci: 0, bi: null, bt: null, draft: null, pending: null };
    st.ts = Date.now();
    states.set(key(userId, rowId), st);
    return st;
}
const clearState = (userId, rowId) => states.delete(key(userId, rowId));

/** Keep the selection inside the data after edits. */
function clamp(st, data) {
    const d = R.normalize(data);
    st.ci = Math.min(Math.max(st.ci, 0), d.containers.length - 1);
    const blocks = d.containers[st.ci].blocks;
    if (st.bi != null && (st.bi < 0 || st.bi >= blocks.length)) st.bi = null;
    if (st.bi == null && ['block', 'bm', 'bone'].includes(st.mode)) st.mode = 'main';   // nothing selected to work on
    return d;
}

/* ---------- small helpers ---------- */

const hex = (n) => (n == null ? 'none' : R.colorToHex(n));
const back = (rowId, label = 'Back', action = 'back') => kit.btn(id(action, rowId), label);

function head(row, st, d, note) {
    const c = d.containers[st.ci];
    const lines = [`### ${row.name}`];
    if (note) lines.push(note);
    lines.push(`-# Container ${st.ci + 1} of ${d.containers.length} · ${c.blocks.length} block${c.blocks.length === 1 ? '' : 's'} · ${R.countComponents(d)}/${R.MAX_COMPONENTS} components · accent ${hex(c.color)}`);
    return lines.join('\n');
}

const section = (box, title, sub) => box.addTextDisplayComponents(kit.text(`### ${title}${sub ? `\n-# ${sub}` : ''}`));

/* ---------- control cards ---------- */

function mainCard(row, st, d, note) {
    const c = d.containers[st.ci];
    const box = kit.box().addTextDisplayComponents(kit.text(head(row, st, d, note)));
    box.addSeparatorComponents(kit.sep());

    const pickOptions = d.containers.map((x, i) => ({
        label: `Container ${i + 1}`,
        value: String(i),
        description: `${x.blocks.length} block${x.blocks.length === 1 ? '' : 's'} · accent ${hex(x.color)}`,
        default: i === st.ci,
    }));
    if (d.containers.length < R.MAX_CONTAINERS) pickOptions.push({ label: 'New container', value: 'new', description: 'Add another container to this message' });
    box.addActionRowComponents(kit.row(kit.select(id('pick', row.id), 'Switch container…', pickOptions)));

    const full = R.countComponents(d) >= R.MAX_COMPONENTS || c.blocks.length >= R.MAX_BLOCKS;
    box.addActionRowComponents(kit.row(kit.select(
        id('add', row.id),
        full ? 'This message is full' : 'Add a component…',
        Object.entries(R.BLOCK_TYPES).map(([value, t]) => ({ label: t.label, value, description: t.hint })),
        { disabled: full },
    )));

    if (c.blocks.length) {
        box.addActionRowComponents(kit.row(kit.select(
            id('blk', row.id),
            'Edit a component…',
            c.blocks.slice(0, 25).map((b, i) => ({ label: R.blockLabel(b, i), value: String(i), default: i === st.bi })),
        )));
    }

    box.addActionRowComponents(kit.row(
        kit.btn(id('copt', row.id), 'Container'),
        kit.btn(id('prev', row.id), 'Preview'),
        kit.btn(id('send', row.id), 'Send', { style: 'primary' }),
        kit.btn(id('close', row.id), 'Done'),
    ));
    box.addTextDisplayComponents(kit.text(kit.sub(`Saved automatically · use {container:${row.name}} in welcome & farewell · variables: /container variables`)));
    return box;
}

function blockCard(row, st, d) {
    const c = d.containers[st.ci];
    const b = c.blocks[st.bi];
    const box = kit.box();
    section(box, `Block ${st.bi + 1} · ${R.BLOCK_TYPES[b.type].label}`, R.blockLabel(b, st.bi).replace(/^\d+\.\s/, ''));

    const A = [];
    if (b.type === 'text') A.push(kit.btn(id('bedit', row.id), 'Edit text', { style: 'primary' }));
    if (b.type === 'section') {
        A.push(kit.btn(id('bedit', row.id), 'Edit text', { style: 'primary' }));
        if (b.accessory?.kind === 'button') A.push(kit.btn(id('bmgr', row.id), 'Edit button'));
    }
    if (b.type === 'media') A.push(kit.btn(id('bedit', row.id), 'Edit images', { style: 'primary' }));
    if (b.type === 'buttons') A.push(kit.btn(id('bmgr', row.id), `Manage buttons (${b.buttons?.length ?? 0})`, { style: 'primary' }));
    if (b.type === 'separator') {
        A.push(kit.btn(id('sdiv', row.id), b.divider ? 'Line: on' : 'Line: off'));
        A.push(kit.btn(id('sspace', row.id), b.spacing === 'large' ? 'Spacing: large' : 'Spacing: small'));
    }
    if (A.length) box.addActionRowComponents(kit.row(...A));

    if (b.type === 'section') {
        const kind = b.accessory?.kind ?? 'thumbnail';
        box.addActionRowComponents(kit.row(kit.select(id('skind', row.id), 'Side element…', [
            { label: 'Thumbnail', value: 'thumbnail', description: 'Small image on the right', default: kind === 'thumbnail' },
            { label: 'Button', value: 'button', description: 'A button on the right', default: kind === 'button' },
        ])));
    }

    box.addActionRowComponents(kit.row(
        kit.btn(id('bup', row.id), 'Up', { disabled: st.bi === 0 }),
        kit.btn(id('bdown', row.id), 'Down', { disabled: st.bi === c.blocks.length - 1 }),
        kit.btn(id('bdel', row.id), 'Remove', { style: 'danger' }),
        back(row.id),
    ));
    return box;
}

function containerOptionsCard(row, st, d) {
    const c = d.containers[st.ci];
    const box = kit.box();
    section(box, `Container ${st.ci + 1}`, `${c.blocks.length} blocks · accent ${hex(c.color)} · spoiler ${c.spoiler ? 'on' : 'off'}`);
    box.addActionRowComponents(kit.row(
        kit.btn(id('left', row.id), 'Move left', { disabled: st.ci === 0 }),
        kit.btn(id('right', row.id), 'Move right', { disabled: st.ci === d.containers.length - 1 }),
        kit.btn(id('dup', row.id), 'Duplicate', { disabled: d.containers.length >= R.MAX_CONTAINERS }),
        kit.btn(id('clear', row.id), 'Clear', { disabled: !c.blocks.length }),
        kit.btn(id('rm', row.id), 'Remove', { style: 'danger', disabled: d.containers.length === 1 }),
    ));
    box.addActionRowComponents(kit.row(
        kit.btn(id('accent', row.id), 'Accent colour'),
        kit.btn(id('spoiler', row.id), c.spoiler ? 'Spoiler: on' : 'Spoiler: off'),
        back(row.id),
    ));
    return box;
}

function accentCard(row, st, d) {
    const c = d.containers[st.ci];
    const box = kit.box();
    section(box, 'Accent colour', 'The bar on the left of the container');
    const options = Object.entries(R.COLORS).map(([value, x]) => ({ label: x.label, value, default: x.value === c.color }));
    options.push({ label: 'Custom hex…', value: 'custom', description: 'Any colour, like #5865F2' });
    box.addActionRowComponents(kit.row(kit.select(id('acc', row.id), 'Choose a colour…', options)));
    box.addActionRowComponents(kit.row(back(row.id, 'Back', 'copt')));
    return box;
}

function sendCard(row, st, d, channelId) {
    const box = kit.box();
    section(box, 'Send', `Post all ${d.containers.length} container${d.containers.length === 1 ? '' : 's'} as one message`);
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(id('sendto', row.id))
        .setPlaceholder('Choose a channel…')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    if (channelId) select.setDefaultChannels(channelId);
    box.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    box.addActionRowComponents(kit.row(back(row.id)));
    return box;
}

/* ----- buttons ----- */

/** The list of buttons being managed: a buttons block, or a section's single button. */
function managed(d, st) {
    const b = d.containers[st.ci].blocks[st.bi];
    if (b.type === 'buttons') return { block: b, list: b.buttons ?? [], max: R.MAX_ROW_BUTTONS, set: false };
    const one = b.accessory?.button;
    return { block: b, list: one ? [one] : [], max: 1, set: true };
}

function buttonsCard(row, st, d, note) {
    const m = managed(d, st);
    const box = kit.box();
    section(box, `Buttons · block ${st.bi + 1}`, m.set ? 'The button beside the text' : `${m.list.length}/${m.max} in this row`);
    if (note) box.addTextDisplayComponents(kit.text(note));
    box.addTextDisplayComponents(kit.text(m.list.length ? m.list.map((b, i) => `${i + 1}. ${R.describeButton(b)}`).join('\n') : kit.sub('No buttons yet.')));
    if (m.list.length) {
        box.addActionRowComponents(kit.row(kit.select(
            id('bsel', row.id), 'Edit a button…',
            m.list.map((b, i) => ({ label: `${i + 1}. ${R.cut(b.label || b.emoji, 40)}`, value: b.id, description: R.BUTTON_STYLES[b.style]?.label })),
        )));
    }
    box.addActionRowComponents(kit.row(
        kit.btn(id('badd', row.id), 'Add button', { style: 'primary', disabled: m.list.length >= m.max }),
        back(row.id, 'Back', 'bback'),
    ));
    return box;
}

function buttonOneCard(row, st, d) {
    const m = managed(d, st);
    const b = m.list.find(x => x.id === st.bt);
    const box = kit.box();
    section(box, 'Button', b ? R.describeButton(b) : 'Not found');
    box.addActionRowComponents(kit.row(
        kit.btn(id('bedit1', row.id), 'Edit', { style: 'primary', disabled: !b }),
        kit.btn(id('bdel1', row.id), 'Remove', { style: 'danger', disabled: !b }),
        back(row.id, 'Back', 'bmgr'),
    ));
    return box;
}

function styleCard(row) {
    const box = kit.box();
    section(box, 'New button', 'Pick a style. Link buttons open a website, the others do something.');
    box.addActionRowComponents(kit.row(kit.select(id('bstyle', row.id), 'Button style…',
        Object.entries(R.BUTTON_STYLES).map(([value, s]) => ({ label: s.label, value, description: s.hint })))));
    box.addActionRowComponents(kit.row(back(row.id, 'Cancel', 'bmgr')));
    return box;
}

function actionCard(row) {
    const box = kit.box();
    section(box, 'New button', 'What should it do when clicked?');
    box.addActionRowComponents(kit.row(kit.select(id('bact', row.id), 'Button action…',
        Object.entries(R.ACTIONS).map(([value, a]) => ({ label: a.label, value, description: a.hint })))));
    box.addActionRowComponents(kit.row(back(row.id, 'Back', 'bstyleback')));
    return box;
}

function pickContainerCard(row, names) {
    const box = kit.box();
    section(box, 'New button', 'Which saved container should it show?');
    if (names.length) {
        box.addActionRowComponents(kit.row(kit.select(id('bcont', row.id), 'Saved container…',
            names.slice(0, 25).map(n => ({ label: n, value: n })))));
    } else {
        box.addTextDisplayComponents(kit.text(kit.sub('You have no saved containers yet.')));
    }
    box.addActionRowComponents(kit.row(back(row.id, 'Back', 'bactback')));
    return box;
}

function pickRoleCard(row) {
    const box = kit.box();
    section(box, 'New button', 'Which role? Admin and moderation roles are not allowed.');
    box.addActionRowComponents(new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId(id('brole', row.id)).setPlaceholder('Choose a role…'),
    ));
    box.addActionRowComponents(kit.row(back(row.id, 'Back', 'bactback')));
    return box;
}

/* ---------- preview ---------- */

/** Live preview, or a plain outline when the message is too big to show next to the controls. */
function previewParts(row, ctx, d) {
    const emptyBoxes = d.containers.filter(c => !c.blocks.length).length;   // each shows a placeholder line
    if (R.countComponents(d) + emptyBoxes <= PREVIEW_BUDGET && R.textLength(d) <= 3300) {   // Discord caps text per message at 4000
        const parts = R.renderContainers({ id: row.id, data: d }, ctx, { preview: true, inert: true });
        if (parts) return parts;
    }
    const lines = d.containers.flatMap((c, i) => [
        `**Container ${i + 1}** · accent ${hex(c.color)}`,
        ...c.blocks.map((b, j) => `-# ${R.blockLabel(b, j)}`),
    ]).slice(0, 30);
    return [kit.box().addTextDisplayComponents(kit.text(`${lines.join('\n') || '-# Empty'}\n\n${kit.sub('Too big to preview here. Press Preview to see it.')}`))];
}

/* ---------- entry ---------- */

/**
 * The whole builder message for the current state.
 * @returns { components, flags }
 */
function screen(row, st, ctx, { note = '', channelId = null, names = [] } = {}) {
    const d = clamp(st, row.data);
    let control;
    switch (st.mode) {
        case 'block':   control = blockCard(row, st, d); break;
        case 'copt':    control = containerOptionsCard(row, st, d); break;
        case 'accent':  control = accentCard(row, st, d); break;
        case 'send':    control = sendCard(row, st, d, channelId); break;
        case 'bm':      control = buttonsCard(row, st, d, note); break;
        case 'bone':    control = buttonOneCard(row, st, d); break;
        case 'bstyle':  control = styleCard(row); break;
        case 'bact':    control = actionCard(row); break;
        case 'bcont':   control = pickContainerCard(row, names); break;
        case 'brole':   control = pickRoleCard(row); break;
        default:        control = mainCard(row, st, d, note); st.mode = 'main';
    }
    return { components: [...previewParts(row, ctx, d), control], flags: V2 };
}

/* ---------- variables ---------- */

function variablesMessage() {
    const lines = variableGroups().flatMap(g => [`**${g.title}**`, ...g.items.map(i => `\`${i.tag}\` ${i.desc}`), '']);
    const box = kit.box().addTextDisplayComponents(kit.text('### Variables'))
        .addTextDisplayComponents(kit.text(kit.sub('Use them in any text, image link or button label. Image links accept one variable, like {user.avatar}.')))
        .addSeparatorComponents(kit.sep())
        .addTextDisplayComponents(kit.text(lines.join('\n').slice(0, 3800)));
    return { components: [box], flags: V2 | MessageFlags.Ephemeral };
}

module.exports = {
    id, getState, clearState, clamp, screen, variablesMessage, managed, V2,
};
