/**
 * @file containerBuilderHandler.js
 * @developer cashholy (carti)
 */

// Interaction handler for the /container builder and for buttons on sent containers.
//   cnb:<action>:<containerId>      builder (dropdowns, buttons, modals)
//   cnbtn:<containerId>:<buttonId>  a button on a sent container message

const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');
const kit = require('../../services/ui');
const { Container } = require('../../database/schemas');
const { applyVars, ctxFromInteraction } = require('../../services/embedVars');
const R = require('../../services/containerRender');
const ui = require('../../services/containerUi');
const { findContainer, sendSavedContainer } = require('../../services/containerSend');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const NO_PING = { parse: [] };

class UserError extends Error {}

/* ---------- small helpers ---------- */

/** Ephemeral one-liner, whether or not the interaction was already answered. */
function say(interaction, component) {
    const body = { components: [component], flags: V2 | EPHEMERAL, allowedMentions: NO_PING };
    if (interaction.deferred && !interaction.replied) return interaction.editReply({ components: [component], flags: V2, allowedMentions: NO_PING });
    return interaction.replied ? interaction.followUp(body) : interaction.reply(body);
}
const fail = (i, text) => say(i, kit.fail(text));

/** Update the builder message in place. */
async function show(interaction, row, st, extra = {}) {
    const names = st.mode === 'bcont'
        ? (await Container.findAll({ where: { guildId: row.guildId }, attributes: ['name'], order: [['name', 'ASC']] })).map(r => r.name)
        : [];
    return interaction.update(ui.screen(row, st, ctxFromInteraction(interaction), { names, ...extra }));
}

/** Clone the data, let `fn` change it, check Discord's limits, save. */
async function commit(row, fn) {
    const data = R.normalize(structuredClone(row.data ?? {}));
    fn(data);
    const problem = R.validate(data);
    if (problem) throw new UserError(problem);
    await row.update({ data });
    return data;
}

function field(customId, label, { style = TextInputStyle.Short, value, max, placeholder, required = false } = {}) {
    const t = new TextInputBuilder().setCustomId(customId).setLabel(label).setStyle(style).setRequired(required);
    if (max) t.setMaxLength(max);
    if (placeholder) t.setPlaceholder(placeholder);
    if (value) t.setValue(String(value).slice(0, max ?? 4000));
    return new ActionRowBuilder().addComponents(t);
}

const modal = (action, rowId, title, ...fields) =>
    new ModalBuilder().setCustomId(ui.id(action, rowId)).setTitle(title).addComponents(...fields);

const blockOf = (d, st) => d.containers[st.ci].blocks[st.bi];

/* ---------- modals ---------- */

function openTextModal(interaction, row, st, d) {
    const b = st.pending?.index != null ? d.containers[st.ci].blocks[st.pending.index] : null;
    return interaction.showModal(modal('m_text', row.id, b ? 'Edit text' : 'Add text',
        field('content', 'Text (markdown and variables work)', { style: TextInputStyle.Paragraph, max: 4000, required: true, value: b?.content,
            placeholder: '### Welcome {user}\nGlad you are here.' })));
}

function openSectionModal(interaction, row, st, d) {
    const b = st.pending?.index != null ? d.containers[st.ci].blocks[st.pending.index] : null;
    const thumb = !b || (b.accessory?.kind ?? 'thumbnail') === 'thumbnail';
    const fields = [field('content', 'Text', { style: TextInputStyle.Paragraph, max: 2000, required: true, value: b?.content })];
    if (thumb) fields.push(field('url', 'Thumbnail link (optional)', { max: 512, value: b?.accessory?.url, placeholder: 'https://… or {user.avatar}' }));
    return interaction.showModal(modal('m_section', row.id, b ? 'Edit section' : 'Add section', ...fields));
}

function openMediaModal(interaction, row, st, d) {
    const b = st.pending?.index != null ? d.containers[st.ci].blocks[st.pending.index] : null;
    const value = b ? (b.items ?? []).map(i => (i.description ? `${i.url} | ${i.description}` : i.url)).join('\n') : '';
    return interaction.showModal(modal('m_media', row.id, b ? 'Edit images' : 'Add images',
        field('urls', `Image links, one per line (max ${R.MAX_MEDIA})`, { style: TextInputStyle.Paragraph, max: 4000, required: true, value,
            placeholder: 'https://example.com/a.png\nhttps://example.com/b.png | optional description' })));
}

function openButtonModal(interaction, row, st) {
    const dr = st.draft;
    const fields = [
        field('label', 'Label', { max: 80, value: dr.label }),
        field('emoji', 'Emoji (optional)', { max: 64, value: dr.emoji, placeholder: '🔥 or <:name:id>' }),
    ];
    if (dr.style === 'link') fields.push(field('url', 'Link', { max: 512, required: true, value: dr.url, placeholder: 'https://… or a variable' }));
    if (dr.action === 'reply') fields.push(field('text', 'Message sent to the clicker', { style: TextInputStyle.Paragraph, max: 2000, required: true, value: dr.text }));
    return interaction.showModal(modal('m_btn', row.id, st.draft.editId ? 'Edit button' : 'New button', ...fields));
}

/* ---------- builder ---------- */

async function handleBuilder(interaction) {
    const [, action, rawId] = interaction.customId.split(':');
    const row = await Container.findByPk(Number(rawId));
    if (!row || row.guildId !== interaction.guildId) return fail(interaction, 'This container no longer exists.');
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) return fail(interaction, 'You need the **Manage Messages** permission.');

    const st = ui.getState(interaction.user.id, row.id);
    const d = ui.clamp(st, row.data);
    const value = interaction.values?.[0];

    try {
        /* ----- modal submits ----- */
        if (interaction.isModalSubmit()) return await handleModal(interaction, action, row, st, d);

        switch (action) {
            /* navigation */
            case 'back': st.mode = 'main'; st.bi = null; return show(interaction, row, st);
            case 'copt': st.mode = 'copt'; return show(interaction, row, st);
            case 'accent': st.mode = 'accent'; return show(interaction, row, st);
            case 'send': st.mode = 'send'; return show(interaction, row, st);
            case 'bback': st.mode = 'block'; return show(interaction, row, st);
            case 'bmgr': st.mode = 'bm'; st.bt = null; return show(interaction, row, st);
            case 'bstyleback': st.mode = 'bstyle'; return show(interaction, row, st);
            case 'bactback': st.mode = 'bact'; return show(interaction, row, st);

            case 'close': {
                ui.clearState(interaction.user.id, row.id);
                return interaction.update({
                    components: [kit.card({ title: 'Saved', lines: [`**${row.name}**`, kit.sub(`Send it with /container send · or put {container:${row.name}} in a welcome or farewell message`)] })],
                    flags: V2,
                });
            }

            case 'prev': {
                const parts = R.renderContainers(row, ctxFromInteraction(interaction), { preview: true });
                return interaction.reply({ components: parts, flags: V2 | EPHEMERAL, allowedMentions: NO_PING });
            }

            /* containers */
            case 'pick': {
                if (value === 'new') {
                    await commit(row, x => x.containers.push(R.newContainer()));
                    st.ci = R.normalize(row.data).containers.length - 1;
                } else st.ci = Number(value) || 0;
                st.bi = null; st.mode = 'main';
                return show(interaction, row, st, { note: value === 'new' ? `Added container ${st.ci + 1}.` : '' });
            }
            case 'left': case 'right': {
                const to = st.ci + (action === 'left' ? -1 : 1);
                if (to < 0 || to >= d.containers.length) return show(interaction, row, st);   // stale button
                await commit(row, x => { [x.containers[st.ci], x.containers[to]] = [x.containers[to], x.containers[st.ci]]; });
                st.ci = to; return show(interaction, row, st);
            }
            case 'dup': {
                await commit(row, x => {
                    const copy = structuredClone(x.containers[st.ci]);
                    for (const b of copy.blocks) {
                        b.id = R.newBlockId();
                        for (const bt of (b.buttons ?? [])) bt.id = R.newButtonId();
                        if (b.accessory?.button) b.accessory.button.id = R.newButtonId();
                    }
                    x.containers.splice(st.ci + 1, 0, copy);
                });
                st.ci += 1; st.mode = 'main'; return show(interaction, row, st, { note: 'Duplicated.' });
            }
            case 'clear': await commit(row, x => { x.containers[st.ci].blocks = []; }); st.bi = null; st.mode = 'main'; return show(interaction, row, st, { note: 'Container cleared.' });
            case 'rm': {
                await commit(row, x => { if (x.containers.length > 1) x.containers.splice(st.ci, 1); });
                st.ci = Math.max(0, st.ci - 1); st.bi = null; st.mode = 'main';
                return show(interaction, row, st, { note: 'Container removed.' });
            }
            case 'spoiler': await commit(row, x => { x.containers[st.ci].spoiler = !x.containers[st.ci].spoiler; }); return show(interaction, row, st);
            case 'acc': {
                if (value === 'custom') return interaction.showModal(modal('m_hex', row.id, 'Accent colour',
                    field('hex', 'Hex colour', { max: 7, required: true, placeholder: '#5865F2', value: d.containers[st.ci].color != null ? R.colorToHex(d.containers[st.ci].color) : undefined })));
                await commit(row, x => { x.containers[st.ci].color = R.COLORS[value]?.value ?? null; });
                st.mode = 'copt'; return show(interaction, row, st);
            }

            /* blocks */
            case 'add': {
                if (['text', 'section', 'media'].includes(value)) {
                    st.pending = { kind: value, index: null };
                    return (value === 'text' ? openTextModal : value === 'section' ? openSectionModal : openMediaModal)(interaction, row, st, d);
                }
                await commit(row, x => {
                    x.containers[st.ci].blocks.push(value === 'separator'
                        ? { id: R.newBlockId(), type: 'separator', divider: true, spacing: 'small' }
                        : { id: R.newBlockId(), type: 'buttons', buttons: [] });
                });
                st.bi = R.normalize(row.data).containers[st.ci].blocks.length - 1;
                st.mode = value === 'buttons' ? 'bm' : 'block';
                return show(interaction, row, st);
            }
            case 'blk': st.bi = Number(value); st.mode = 'block'; return show(interaction, row, st);
            case 'bedit': {
                const b = blockOf(d, st);
                st.pending = { kind: b.type, index: st.bi };
                return (b.type === 'text' ? openTextModal : b.type === 'section' ? openSectionModal : openMediaModal)(interaction, row, st, d);
            }
            case 'bup': case 'bdown': {
                const to = st.bi + (action === 'bup' ? -1 : 1);
                if (to < 0 || to >= d.containers[st.ci].blocks.length) return show(interaction, row, st);   // stale button
                await commit(row, x => { const a = x.containers[st.ci].blocks; [a[st.bi], a[to]] = [a[to], a[st.bi]]; });
                st.bi = to; return show(interaction, row, st);
            }
            case 'bdel': await commit(row, x => { x.containers[st.ci].blocks.splice(st.bi, 1); }); st.bi = null; st.mode = 'main'; return show(interaction, row, st, { note: 'Component removed.' });
            case 'sdiv': await commit(row, x => { const b = x.containers[st.ci].blocks[st.bi]; b.divider = !b.divider; }); return show(interaction, row, st);
            case 'sspace': await commit(row, x => { const b = x.containers[st.ci].blocks[st.bi]; b.spacing = b.spacing === 'large' ? 'small' : 'large'; }); return show(interaction, row, st);
            case 'skind': {
                await commit(row, x => {
                    const b = x.containers[st.ci].blocks[st.bi];
                    if (value === 'button') b.accessory = { kind: 'button', button: b.accessory?.button ?? null };
                    else b.accessory = { kind: 'thumbnail', url: b.accessory?.url ?? '' };
                });
                if (value === 'button' && !blockOf(R.normalize(row.data), st).accessory.button) st.mode = 'bm';
                return show(interaction, row, st);
            }

            /* buttons */
            case 'bsel': st.bt = value; st.mode = 'bone'; return show(interaction, row, st);
            case 'badd': st.draft = { editId: null }; st.mode = 'bstyle'; return show(interaction, row, st);
            case 'bedit1': {
                const b = ui.managed(d, st).list.find(x => x.id === st.bt);
                if (!b) return show(interaction, row, st);
                st.draft = { ...b, editId: b.id }; st.mode = 'bstyle'; return show(interaction, row, st);
            }
            case 'bdel1': {
                await commit(row, x => {
                    const b = x.containers[st.ci].blocks[st.bi];
                    if (b.type === 'buttons') b.buttons = b.buttons.filter(y => y.id !== st.bt);
                    else if (b.accessory?.button?.id === st.bt) b.accessory.button = null;
                });
                st.bt = null; st.mode = 'bm'; return show(interaction, row, st, { note: 'Button removed.' });
            }
            case 'bstyle': {
                st.draft = { ...st.draft, style: value };
                if (value === 'link') { st.draft.action = undefined; return openButtonModal(interaction, row, st); }
                st.mode = 'bact'; return show(interaction, row, st);
            }
            case 'bact': {
                st.draft.action = value;
                if (value === 'reply') return openButtonModal(interaction, row, st);
                st.mode = value === 'container' ? 'bcont' : 'brole';
                return show(interaction, row, st);
            }
            case 'bcont': st.draft.containerName = value; return openButtonModal(interaction, row, st);
            case 'brole': {
                const role = interaction.roles?.first();
                const problem = R.roleProblem(interaction.guild, role, interaction.member);
                if (problem) return fail(interaction, problem);
                st.draft.roleId = role.id;
                return openButtonModal(interaction, row, st);
            }

            /* sending */
            case 'sendto': {
                const channel = interaction.channels?.first();
                const res = await sendSavedContainer(channel, row, ctxFromInteraction(interaction, channel), { actor: interaction.member });
                st.mode = 'main';
                return show(interaction, row, st, { note: res.ok ? `Sent to <#${channel.id}> · [jump](${res.message.url})` : `Couldn't send: ${res.error}` });
            }
        }
    } catch (err) {
        if (err instanceof UserError) return fail(interaction, err.message);
        throw err;
    }
    return false;
}

async function handleModal(interaction, action, row, st, d) {
    const get = (k) => (interaction.fields.getTextInputValue(k) ?? '').trim();

    if (action === 'm_hex') {
        const raw = get('hex');
        const color = R.parseColor(raw);
        if (color === undefined) throw new UserError('That isn\'t a valid hex colour. Try `#5865F2`.');
        await commit(row, x => { x.containers[st.ci].color = color; });
        st.mode = 'copt';
        return show(interaction, row, st);
    }

    if (action === 'm_text') {
        const content = R.clean(get('content'));
        if (!content) throw new UserError('Text can\'t be empty.');
        const at = st.pending?.index;
        await commit(row, x => {
            const blocks = x.containers[st.ci].blocks;
            if (at != null && blocks[at]) blocks[at].content = content;
            else blocks.push({ id: R.newBlockId(), type: 'text', content });
        });
        st.pending = null;
        return show(interaction, row, st, { note: at != null ? 'Text updated.' : 'Text added.' });
    }

    if (action === 'm_section') {
        const content = R.clean(get('content'));
        if (!content) throw new UserError('Text can\'t be empty.');
        let url = null;                       // stays null when the modal has no link field (button beside the text)
        try { url = get('url'); } catch (_) { /* field not present */ }
        if (url && !R.isUrlOrVar(url)) throw new UserError('That isn\'t a valid link. Use a full `https://` link or a variable like `{user.avatar}`.');
        const at = st.pending?.index;
        await commit(row, x => {
            const blocks = x.containers[st.ci].blocks;
            if (at != null && blocks[at]) {
                blocks[at].content = content;
                if (url !== null) blocks[at].accessory = { kind: 'thumbnail', url };
            } else blocks.push({ id: R.newBlockId(), type: 'section', content, accessory: { kind: 'thumbnail', url: url ?? '' } });
        });
        st.pending = null;
        return show(interaction, row, st, { note: at != null ? 'Section updated.' : 'Section added.' });
    }

    if (action === 'm_media') {
        const items = [];
        for (const line of get('urls').split('\n').map(l => l.trim()).filter(Boolean)) {
            const [url, ...desc] = line.split('|');
            if (!R.isUrlOrVar(url.trim())) throw new UserError(`Not a valid link: \`${R.cut(url, 60)}\``);
            items.push({ url: url.trim(), description: desc.join('|').trim().slice(0, 1024) || undefined });
        }
        if (!items.length) throw new UserError('Add at least one image link.');
        if (items.length > R.MAX_MEDIA) throw new UserError(`A gallery holds ${R.MAX_MEDIA} images at most.`);
        const at = st.pending?.index;
        await commit(row, x => {
            const blocks = x.containers[st.ci].blocks;
            if (at != null && blocks[at]) blocks[at].items = items;
            else blocks.push({ id: R.newBlockId(), type: 'media', items });
        });
        st.pending = null;
        return show(interaction, row, st, { note: at != null ? 'Images updated.' : 'Images added.' });
    }

    if (action === 'm_btn') {
        const dr = st.draft;
        if (!dr?.style) throw new UserError('That button setup expired. Start again.');
        const label = get('label').slice(0, 80);
        const emoji = get('emoji');
        if (emoji && !R.isEmoji(emoji)) throw new UserError('That isn\'t a single emoji. Use a normal emoji or a server emoji like `<:name:id>`.');
        if (!label && !emoji) throw new UserError('Give the button a label or an emoji.');

        const b = { id: dr.editId ?? R.newButtonId(), style: dr.style, label: label || undefined, emoji: emoji || undefined };
        if (dr.style === 'link') {
            const url = get('url');
            if (!R.isUrlOrVar(url)) throw new UserError('That isn\'t a valid link. Use a full `https://` link or a variable.');
            b.url = url;
        } else {
            b.action = dr.action;
            if (dr.action === 'reply') {
                b.text = R.clean(get('text'));
                if (!b.text) throw new UserError('The message can\'t be empty.');
            } else if (dr.action === 'container') b.containerName = dr.containerName;
            else b.roleId = dr.roleId;
        }

        await commit(row, x => {
            const blk = x.containers[st.ci].blocks[st.bi];
            if (!blk) throw new UserError('That component is gone. Go back and try again.');
            if (blk.type === 'buttons') {
                blk.buttons ??= [];
                const at = blk.buttons.findIndex(y => y.id === b.id);
                if (at >= 0) blk.buttons[at] = b; else blk.buttons.push(b);
            } else blk.accessory = { kind: 'button', button: b };
        });
        st.draft = null; st.mode = 'bm';
        return show(interaction, row, st, { note: 'Button saved.' });
    }
    return false;
}

/* ---------- buttons on sent containers ---------- */

async function handleContainerButton(interaction) {
    const [, rawId, buttonId] = interaction.customId.split(':');
    const gone = () => say(interaction, kit.warn('This button is no longer available.'));

    if (!interaction.inGuild()) return gone();
    const row = await Container.findByPk(Number(rawId));
    if (!row || row.guildId !== interaction.guildId) return gone();
    const b = R.findButton(row.data, buttonId);
    if (!b) return gone();

    const ctx = ctxFromInteraction(interaction);

    if (b.action === 'reply') {
        return interaction.reply({
            content: applyVars(b.text ?? '', ctx).slice(0, 2000) || '​',
            allowedMentions: NO_PING,
            flags: EPHEMERAL,
        });
    }

    if (b.action === 'container') {
        const target = await findContainer(interaction.guildId, b.containerName);
        const parts = target && R.renderContainers(target, ctx);
        if (!parts) return say(interaction, kit.warn('That message is no longer available.'));
        return interaction.reply({ components: parts, flags: V2 | EPHEMERAL, allowedMentions: NO_PING });
    }

    if (b.action?.startsWith('role_')) {
        await interaction.deferReply({ flags: EPHEMERAL });
        const guild = interaction.guild;
        const role = guild.roles.cache.get(b.roleId);
        const problem = R.roleProblem(guild, role);
        if (problem) return say(interaction, kit.fail(`This button is misconfigured. ${problem}`));

        const member = interaction.member;
        const has = member.roles.cache.has(role.id);
        const wantAdd = b.action === 'role_add' || (b.action === 'role_toggle' && !has);

        try {
            if (wantAdd) {
                if (has) return say(interaction, kit.warn(`You already have <@&${role.id}>`));
                await member.roles.add(role, 'Container button');
                return say(interaction, kit.success(`Added <@&${role.id}>`));
            }
            if (!has) return say(interaction, kit.warn(`You don't have <@&${role.id}>`));
            await member.roles.remove(role, 'Container button');
            return say(interaction, kit.success(`Removed <@&${role.id}>`));
        } catch (_) {
            return say(interaction, kit.fail('I couldn\'t change that role.'));
        }
    }

    return gone();
}

/* ---------- entry ---------- */

module.exports = {
    async handle(interaction) {
        const id = interaction.customId;
        if (!id) return false;
        if (id.startsWith('cnbtn:') && interaction.isButton()) { await handleContainerButton(interaction); return true; }
        if (id.startsWith('cnb:')) { await handleBuilder(interaction); return true; }
        return false;
    },
};
