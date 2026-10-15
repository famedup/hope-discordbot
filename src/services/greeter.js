// ─── cashholy (carti) · developer ───

// hope — greetings: welcome, farewell and boost messages share one engine.
//
//   panel      the configuration card (`welcome`, `farewell`, `boost` commands)
//   compose    text + {embed:name} / {container:name} -> a sendable payload
//   deliver    post it (events and previews)
//   announce   called by the join / leave / boost events

const {
    SectionBuilder,
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');
const kit = require('./ui');
const emojis = require('../media/emojis.json');
const { Greeting, WelcomeConfig, FarewellConfig, GuildConfig, Embed, Container } = require('../database/schemas');
const { applyVars, variableGroups, ctxFromMember } = require('./embedVars');
const { renderEmbed } = require('./embedRender');
const { renderContainers, emptyData: emptyContainerData, newBlockId } = require('./containerRender');
const { TAG_RE: CONTAINER_TAG } = require('./containerSend');

const EMBED_TAG = /\{embed:([a-z0-9_-]{1,16})\}/i;
const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const MAX_MESSAGE = 2000;

const KINDS = {
    welcome:  { title: 'Welcome',  blurb: 'Greets people when they join',        def: 'Welcome {user} to **{server}**! You are member {server.members.ord}.' },
    farewell: { title: 'Farewell', blurb: 'Says goodbye when someone leaves',    def: '**{user.name}** has left **{server}**.' },
    boost:    { title: 'Boost',    blurb: 'Thanks people who boost the server',  def: '{user} just boosted **{server}**! We now have **{boost.count}** boosts.' },
};

const AUTO_DELETE = [
    [0, 'Keep the message'], [5, '5 seconds'], [10, '10 seconds'], [30, '30 seconds'],
    [60, '1 minute'], [300, '5 minutes'], [600, '10 minutes'],
];
const autoLabel = (s) => (AUTO_DELETE.find(([v]) => v === s)?.[1] ?? `${s} seconds`);

/* ---------- storage ---------- */

const cache = new Map();   // `${guildId}:${kind}` -> { ts, row }
const TTL = 30000;
const key = (g, k) => `${g}:${k}`;
const bust = (g, k) => cache.delete(key(g, k));

async function read(guildId, kind) {
    const hit = cache.get(key(guildId, kind));
    if (hit && Date.now() - hit.ts < TTL) return hit.row;
    const row = await Greeting.findOne({ where: { guildId, kind } });
    cache.set(key(guildId, kind), { ts: Date.now(), row });
    return row;
}

/** Old-style {tags} -> the variable names used now. */
const LEGACY_VARS = {
    mention: 'user', avatar: 'user.avatar', user: 'user.name', user_nick: 'user.nick', joindate: 'user.joined',
    user_createdate: 'user.created', server: 'server', count: 'server.members', server_icon: 'server.icon',
};
const convertLegacy = (t) => (t ?? '').replace(/\{([a-z_]+)\}/gi, (m, k) => (LEGACY_VARS[k.toLowerCase()] ? `{${LEGACY_VARS[k.toLowerCase()]}}` : m));

/** What an older setup (welcome_config / farewell_config) amounts to, so editing here never switches it off. */
async function legacyOf(guildId, kind) {
    if (kind === 'boost') return null;
    const Model = kind === 'welcome' ? WelcomeConfig : FarewellConfig;
    const cfg = await Model.findOne({ where: { guildId } });
    if (!cfg) return null;
    const gc = await GuildConfig.findOne({ where: { guildId } });
    return { cfg, enabled: !!(kind === 'welcome' ? gc?.welcomeInOn : gc?.welcomeOutOn) };
}

/** Create the row on first change, carrying over an older setup when there is one. */
async function ensure(guildId, kind) {
    let row = await Greeting.findOne({ where: { guildId, kind } });
    if (row) return row;

    const values = { guildId, kind, enabled: false, message: KINDS[kind].def, autoDelete: 0, channelId: null };
    const old = await legacyOf(guildId, kind);
    if (old) {
        values.channelId = old.cfg.channelId ?? null;
        values.enabled = old.enabled && !!old.cfg.channelId;
        if (old.cfg.type === 'simple') {
            if (old.cfg.message) values.message = convertLegacy(old.cfg.message);
        } else {
            // the old container-style design becomes a saved container, used through {container:name}
            const taken = new Set((await Container.findAll({ where: { guildId }, attributes: ['name'] })).map(r => r.name));
            let name = kind; for (let n = 2; taken.has(name); n++) name = `${kind}${n}`;
            const blocks = [{ id: newBlockId(), type: 'text', content: `### ${convertLegacy(old.cfg.title || KINDS[kind].title)}` }];
            const body = convertLegacy(old.cfg.description || '');
            if (body) blocks.push(old.cfg.thumbnailUrl
                ? { id: newBlockId(), type: 'section', content: body, accessory: { kind: 'thumbnail', url: convertLegacy(old.cfg.thumbnailUrl) } }
                : { id: newBlockId(), type: 'text', content: body });
            if (old.cfg.imageUrl) blocks.push({ id: newBlockId(), type: 'media', items: [{ url: convertLegacy(old.cfg.imageUrl) }] });
            const data = emptyContainerData();
            data.containers[0].blocks = blocks;
            data.containers[0].color = old.cfg.color ?? null;
            await Container.create({ guildId, name, data });
            values.message = `{container:${name}}`;
        }
    }
    row = await Greeting.create(values);
    bust(guildId, kind);
    return row;
}

/* ---------- message building ---------- */

const bare = (text) => (text ?? '').replace(CONTAINER_TAG, '').replace(EMBED_TAG, '').replace(/[ \t]+\n/g, '\n').trim();
const tagsOf = (text) => ({ container: text?.match(CONTAINER_TAG)?.[1]?.toLowerCase() ?? null, embed: text?.match(EMBED_TAG)?.[1]?.toLowerCase() ?? null });

/**
 * Turn a greeting message into something Discord can send.
 * @returns { kind: 'text'|'embed'|'container', payload, problem? }   payload is null when nothing can be sent
 */
async function compose(guild, text, ctx) {
    const { container, embed } = tagsOf(text);
    const rest = applyVars(bare(text), ctx).trim().slice(0, MAX_MESSAGE);
    const asText = rest ? { content: rest } : null;

    if (container) {
        const row = await Container.findOne({ where: { guildId: guild.id, name: container } });
        if (!row) return { kind: 'text', payload: asText, problem: `Container \`${container}\` doesn't exist` };
        const parts = renderContainers(row, ctx, { content: rest });
        if (!parts) return { kind: 'text', payload: asText, problem: `Container \`${container}\` is empty` };
        return { kind: 'container', name: container, payload: { components: parts, flags: V2 } };
    }
    if (embed) {
        const row = await Embed.findOne({ where: { guildId: guild.id, name: embed } });
        if (!row) return { kind: 'text', payload: asText, problem: `Embed \`${embed}\` doesn't exist` };
        const payload = renderEmbed(row, ctx, { content: rest });
        if (!payload) return { kind: 'text', payload: asText, problem: `Embed \`${embed}\` is empty` };
        return { kind: 'embed', name: embed, payload };
    }
    return { kind: 'text', payload: asText, problem: asText ? undefined : 'The message is empty' };
}

/** Post a greeting. @returns { ok, message?, error?, problem? } */
async function deliver(guild, row, member, { channel } = {}) {
    channel ??= guild.channels.cache.get(row.channelId);
    if (!channel?.isTextBased?.()) return { ok: false, error: 'The channel no longer exists.' };

    const need = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
    if (!channel.permissionsFor(guild.members.me)?.has(need)) return { ok: false, error: `I can't send messages in <#${channel.id}>.` };

    const out = await compose(guild, row.message, ctxFromMember(member, channel));
    if (!out.payload) return { ok: false, error: out.problem ?? 'Nothing to send.' };
    if (out.kind === 'embed' && !channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.EmbedLinks)) {
        return { ok: false, error: `I need **Embed Links** in <#${channel.id}>.` };
    }

    try {
        const message = await channel.send({ ...out.payload, allowedMentions: { parse: ['users'] } });
        if (row.autoDelete > 0) setTimeout(() => message.delete().catch(() => {}), row.autoDelete * 1000).unref?.();
        return { ok: true, message, problem: out.problem };
    } catch (err) {
        return { ok: false, error: `Discord rejected the message: ${err.message}` };
    }
}

/**
 * For the join / leave / boost events.
 * @returns true when this server is configured here (the caller should stop), false to let an older setup run
 */
async function announce(kind, member) {
    const row = await read(member.guild.id, kind);
    if (!row) return false;
    if (!row.enabled || !row.channelId || !row.message) return true;
    const res = await deliver(member.guild, row, member);
    if (!res.ok) console.error(`[greeter] ${kind} in ${member.guild.id}: ${res.error}`);
    return true;
}

/* ---------- the panel ---------- */

const quote = (s) => s.split('\n').map(l => `> ${l}`).join('\n');
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** What the message will send, in one line. */
function deliveryLine(msg, found) {
    const { container, embed } = tagsOf(msg);
    const text = bare(msg) ? 'text' : null;
    if (container) return `${text ? 'Text + ' : ''}Container \`${container}\`${found.container === false ? ' · **not found**' : ''}`;
    if (embed) return `${text ? 'Text + ' : ''}Embed \`${embed}\`${found.embed === false ? ' · **not found**' : ''}`;
    return 'Text only';
}

async function savedDesigns(guildId) {
    const [embeds, containers] = await Promise.all([
        Embed.findAll({ where: { guildId }, attributes: ['name'], order: [['name', 'ASC']] }),
        Container.findAll({ where: { guildId }, attributes: ['name'], order: [['name', 'ASC']] }),
    ]);
    return { embeds: embeds.map(r => r.name), containers: containers.map(r => r.name) };
}

/**
 * @param row   the Greeting row, or null when nothing is saved yet
 * @param opts  { member, note, legacy }
 */
async function panel(guild, kind, row, { member, note = '', legacy = false } = {}) {
    const meta = KINDS[kind];
    const cur = row ?? { enabled: false, channelId: null, message: meta.def, autoDelete: 0 };
    const designs = await savedDesigns(guild.id);
    const tags = tagsOf(cur.message);
    const found = {
        embed: tags.embed ? designs.embeds.includes(tags.embed) : undefined,
        container: tags.container ? designs.containers.includes(tags.container) : undefined,
    };

    // live preview of the text, filled in with the admin's own profile
    const ctx = member ? ctxFromMember(member, guild.channels.cache.get(cur.channelId) ?? null) : { guild };
    const shown = applyVars(bare(cur.message), ctx).trim();

    /* card 1: status */
    const toggle = kit.btn(`greet:toggle:${kind}`, cur.enabled ? 'Disable' : 'Enable', { style: cur.enabled ? 'danger' : 'success' });
    const head = new SectionBuilder()
        .addTextDisplayComponents(kit.text(`### ${meta.title}\n-# ${meta.blurb}`))
        .setButtonAccessory(toggle);

    const info = [
        `**Status**  ${cur.enabled ? `${emojis.enabled} On` : `${emojis.disabled} Off`}`,
        `**Channel**  ${cur.channelId ? `<#${cur.channelId}>` : '`Not set`'}`,
        `**Delivery**  ${deliveryLine(cur.message ?? '', found)}`,
        `**Auto-delete**  ${cur.autoDelete ? autoLabel(cur.autoDelete) : 'Off'}`,
    ].join('\n');

    const card = kit.box().addSectionComponents(head).addSeparatorComponents(kit.sep());
    if (note) card.addTextDisplayComponents(kit.text(note));
    card.addTextDisplayComponents(kit.text(info)).addSeparatorComponents(kit.sep(false));
    card.addTextDisplayComponents(kit.text(`**Message**\n${shown ? quote(clip(shown, 420)) : kit.sub('Only the attached design is sent.')}`));
    const foot = [legacy && !row ? 'An older setup is running. Change anything here and it moves over.' : null,
        'Tags: {embed:name} and {container:name}'].filter(Boolean).join('  ·  ');
    card.addTextDisplayComponents(kit.text(kit.sub(foot)));

    /* card 2: controls */
    const channelSel = new ChannelSelectMenuBuilder()
        .setCustomId(`greet:channel:${kind}`)
        .setPlaceholder('Where should it go?')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    if (cur.channelId) channelSel.setDefaultChannels(cur.channelId);

    const attachOptions = [{ label: 'Text only', value: 'none', description: 'Send just the message', default: !tags.embed && !tags.container }];
    for (const n of designs.embeds.slice(0, 11)) attachOptions.push({ label: `Embed · ${n}`, value: `e:${n}`, description: 'Saved embed', default: tags.embed === n });
    for (const n of designs.containers.slice(0, 12)) attachOptions.push({ label: `Container · ${n}`, value: `c:${n}`, description: 'Saved container', default: tags.container === n });

    const controls = kit.box()
        .addActionRowComponents(new ActionRowBuilder().addComponents(channelSel))
        .addActionRowComponents(kit.row(kit.select(`greet:attach:${kind}`, 'Attach an embed or container…', attachOptions)))
        .addActionRowComponents(kit.row(kit.select(`greet:auto:${kind}`, `Auto-delete: ${cur.autoDelete ? autoLabel(cur.autoDelete).toLowerCase() : 'off'}`,
            AUTO_DELETE.map(([v, label]) => ({ label, value: String(v), default: v === (cur.autoDelete ?? 0) })))))
        .addActionRowComponents(kit.row(
            kit.btn(`greet:msg:${kind}`, 'Set message', { style: 'primary' }),
            kit.btn(`greet:prev:${kind}`, 'Preview'),
            kit.btn(`greet:vars:${kind}`, 'Variables'),
            kit.btn(`greet:reset:${kind}`, 'Reset', { style: 'danger' }),
        ));

    return [card, controls];
}

function confirmReset(kind) {
    return [kit.box('warning')
        .addTextDisplayComponents(kit.text(`### Reset ${KINDS[kind].title.toLowerCase()} message?\n-# Channel, message and status are cleared.`))
        .addActionRowComponents(kit.row(
            kit.btn(`greet:yes:${kind}`, 'Reset', { style: 'danger' }),
            kit.btn(`greet:no:${kind}`, 'Cancel'),
        ))];
}

/** Variables list with a group picker. */
async function variablesCard(guild, kind, group = 'User') {
    const groups = variableGroups();
    const names = [...groups.map(g => g.title), 'Designs'];
    const current = names.includes(group) ? group : 'User';

    let body;
    if (current === 'Designs') {
        const d = await savedDesigns(guild.id);
        const list = (a) => (a.length ? a.slice(0, 15).map(n => `\`${n}\``).join('  ') : kit.sub('none yet'));
        body = [
            '`{embed:name}` Sends a saved embed (`/embed create`)',
            '`{container:name}` Sends a saved container (`/container create`)',
            '',
            `**Embeds**  ${list(d.embeds)}`,
            `**Containers**  ${list(d.containers)}`,
            '',
            kit.sub('Text around the tag is sent with it. If both are used, the container wins.'),
        ].join('\n');
    } else {
        body = groups.find(g => g.title === current).items.map(i => `\`${i.tag}\`  ${i.desc}`).join('\n');
    }

    const box = kit.box()
        .addTextDisplayComponents(kit.text(`### Variables\n-# Work in the message, embeds and containers. Pick a group.`))
        .addActionRowComponents(kit.row(kit.select(`greet:vgroup:${kind}`, 'Variable group…', names.map(n => ({ label: n, value: n, default: n === current })))))
        .addSeparatorComponents(kit.sep())
        .addTextDisplayComponents(kit.text(body.slice(0, 3500)));
    return [box];
}

/* ---------- entry points for the commands ---------- */

const canManage = (member) => !!member?.permissions?.has(PermissionFlagsBits.ManageGuild) || !!member?.permissions?.has(PermissionFlagsBits.Administrator);

/** `welcome`, `welcome setup`, `welcome config` ... */
async function openPanel(ctx, kind) {
    const member = ctx.member;
    if (!canManage(member)) return kit.say.error(ctx, 'You need the **Manage Server** permission.');
    const guild = ctx.guild;
    const row = await read(guild.id, kind);
    const legacy = !row && !!(await legacyOf(guild.id, kind));
    return kit.send(ctx, await panel(guild, kind, row, { member, legacy }), { extra: { allowedMentions: { parse: [] } } });
}

/** `welcome reset` — ask first. */
async function openReset(ctx, kind) {
    if (!canManage(ctx.member)) return kit.say.error(ctx, 'You need the **Manage Server** permission.');
    return kit.send(ctx, confirmReset(kind));
}

/** `welcome test` — send the message in this channel using your own profile. */
async function sendTest(ctx, kind) {
    const member = ctx.member;
    if (!canManage(member)) return kit.say.error(ctx, 'You need the **Manage Server** permission.');
    const row = (await read(ctx.guild.id, kind)) ?? { message: KINDS[kind].def, autoDelete: 0 };
    const out = await compose(ctx.guild, row.message, ctxFromMember(member, ctx.channel));
    if (!out.payload) return kit.say.error(ctx, out.problem ?? 'Nothing to send.');
    const isSlash = typeof ctx.isChatInputCommand === 'function';
    const body = { ...out.payload, allowedMentions: { parse: [] } };
    if (isSlash) return ctx.reply({ ...body, flags: (body.flags ?? 0) | EPHEMERAL });
    return ctx.reply(body);
}

module.exports = {
    KINDS, AUTO_DELETE, V2, EPHEMERAL, MAX_MESSAGE,
    read, ensure, bust, legacyOf, compose, deliver, announce,
    panel, confirmReset, variablesCard, savedDesigns, tagsOf, bare, canManage,
    openPanel, openReset, sendTest,
};
