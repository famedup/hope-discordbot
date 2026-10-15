/* ⌁ crafted by cashholy (carti) ⌁ */

// Interaction handler for the /embed builder and for buttons on sent embeds.
//   emb:<action>:<embedId>      builder (dropdowns, buttons, modals)
//   embtn:<embedId>:<buttonId>  a button on a sent embed

const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const emojis = require('../../media/emojis.json');
const { Embed } = require('../../database/schemas');
const { ctxFromInteraction, applyVars } = require('../../services/embedVars');
const {
    MAX_BUTTONS, MAX_FIELDS, LIMITS,
    isUrlOrVar, isEmoji, parseColor, colorToHex, clean, newButtonId, rawLength, renderEmbed, roleProblem,
} = require('../../services/embedRender');
const { findEmbed, sendSavedEmbed } = require('../../services/embedSend');
const ui = require('../../services/embedUi');

const EPHEMERAL = MessageFlags.Ephemeral;
const noPing = { parse: [] };
const ok = t => `${emojis.success} ${t}`;
const warn = t => `${emojis.warning} ${t}`;

/* ---------- small helpers ---------- */

function textInput(customId, label, { style = TextInputStyle.Short, value, max, placeholder } = {}) {
    const t = new TextInputBuilder().setCustomId(customId).setLabel(label).setStyle(style).setRequired(false);
    if (max) t.setMaxLength(max);
    if (placeholder) t.setPlaceholder(placeholder);
    if (value) t.setValue(String(value).slice(0, max ?? 4000));
    return new ActionRowBuilder().addComponents(t);
}

async function saveData(row, mutate) {
    const data = structuredClone(row.data ?? {});
    data.buttons ??= [];
    data.fields ??= [];
    mutate(data);
    await row.update({ data });
    return data;
}

const fail = (interaction, text) => interaction.reply(ui.notice(text, false));

/** Update the builder message with a new screen. */
function show(interaction, screen) {
    return interaction.isFromMessage?.() || interaction.isMessageComponent?.()
        ? interaction.update(screen)
        : interaction.reply({ ...screen, flags: EPHEMERAL });
}

const newId = newButtonId;

/* ---------- modals ---------- */

function modalFor(kind, row, draft) {
    const d = row.data ?? {};
    const modal = new ModalBuilder().setCustomId(`emb:m${kind}:${row.id}`);

    switch (kind) {
        case 'basic':
            return modal.setTitle(`Text · ${row.name}`).addComponents(
                textInput('title', 'Title', { value: d.title, max: LIMITS.title }),
                textInput('description', 'Description', { value: d.description, max: LIMITS.description, style: TextInputStyle.Paragraph }),
                textInput('color', 'Color (hex)', { value: colorToHex(d.color), max: 7, placeholder: '#5865F2' }),
            );
        case 'author':
            return modal.setTitle('Author').addComponents(
                textInput('name', 'Text', { value: d.author?.name, max: LIMITS.authorName }),
                textInput('icon', 'Icon link', { value: d.author?.icon, max: 512, placeholder: 'https://… or {user.avatar}' }),
            );
        case 'footer':
            return modal.setTitle('Footer').addComponents(
                textInput('text', 'Text', { value: d.footer?.text, max: LIMITS.footerText }),
                textInput('icon', 'Icon link', { value: d.footer?.icon, max: 512, placeholder: 'https://… or {server.icon}' }),
            );
        case 'images':
            return modal.setTitle('Images').addComponents(
                textInput('image', 'Large image link', { value: d.image, max: 512, placeholder: 'https://…' }),
                textInput('thumbnail', 'Thumbnail link', { value: d.thumbnail, max: 512, placeholder: 'https://… or {user.avatar}' }),
            );
        case 'fdet':
            return modal.setTitle('Field').addComponents(
                textInput('name', 'Name', { value: draft.name, max: LIMITS.fieldName }),
                textInput('value', 'Value', { value: draft.value, max: LIMITS.fieldValue, style: TextInputStyle.Paragraph }),
            );
        case 'bdet': {
            modal.setTitle(draft.style === 'link' ? 'Link button' : 'Button details').addComponents(
                textInput('label', 'Label', { value: draft.label, max: 80 }),
                textInput('emoji', 'Emoji (optional)', { value: draft.emoji, max: 64, placeholder: '😀 or <:name:id>' }),
            );
            if (draft.style === 'link') {
                modal.addComponents(textInput('url', 'Link', { value: draft.url, max: 512, placeholder: 'https://…' }));
            } else if (draft.action === 'reply') {
                modal.addComponents(textInput('text', 'Reply message', { value: draft.text, max: 2000, style: TextInputStyle.Paragraph }));
            }
            return modal;
        }
    }
}

/** Apply a submitted embed modal. Returns the status text for the screen. */
async function applyModal(kind, interaction, row) {
    const f = name => (interaction.fields.getTextInputValue(name) ?? '').trim();
    const errors = [];

    await saveData(row, d => {
        if (kind === 'basic') {
            const title = clean(f('title')), description = clean(f('description')), color = f('color');
            title ? (d.title = title) : delete d.title;
            description ? (d.description = description) : delete d.description;
            if (!color) delete d.color;
            else if (parseColor(color) === undefined) errors.push('Color must be a hex code like `#5865F2`.');
            else d.color = parseColor(color);
        }

        if (kind === 'author' || kind === 'footer') {
            const textKey = kind === 'author' ? 'name' : 'text';
            const text = clean(f(textKey)), icon = f('icon');
            if (!text) {
                delete d[kind];
                if (icon) errors.push(`An icon needs ${kind} text too.`);
            } else if (icon && !isUrlOrVar(icon)) {
                errors.push(`That ${kind} icon isn't a valid link.`);
                d[kind] = { [textKey]: text };
            } else {
                d[kind] = { [textKey]: text, ...(icon && { icon }) };
            }
        }

        if (kind === 'images') {
            for (const key of ['image', 'thumbnail']) {
                const v = f(key);
                if (!v) delete d[key];
                else if (!isUrlOrVar(v)) errors.push(`That ${key} isn't a valid link.`);
                else d[key] = v;
            }
        }

        if (rawLength(d) > LIMITS.total) errors.push(`Embeds hold ${LIMITS.total} characters in total, so some text may be cut off.`);
    });

    return errors.length ? errors.map(warn).join('\n') : ok('Saved.');
}

/* ---------- builder ---------- */

async function handleBuilder(interaction) {
    const [, action, rawId] = interaction.customId.split(':');
    const embedId = Number(rawId);

    if (!interaction.inGuild()) { await fail(interaction, 'Use this inside a server.'); return true; }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        await fail(interaction, 'You need the **Manage Messages** permission.');
        return true;
    }

    const row = await Embed.findOne({ where: { id: embedId, guildId: interaction.guildId } });
    if (!row) {
        await show(interaction, { content: `${emojis.error} That embed no longer exists.`, embeds: [], components: [] });
        return true;
    }

    const ctx = ctxFromInteraction(interaction);
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const main = text => ui.mainScreen(row, ctx, text);
    const buttonsView = (text, confirm) => ui.buttonsScreen(row, ctx, text, confirm);
    const fieldsView = text => ui.fieldsScreen(row, ctx, text);
    const expired = (view = buttonsView) => show(interaction, view(warn('That session expired. Start again.')));

    // ----- modal submits -----
    if (interaction.isModalSubmit()) {
        const kind = action.slice(1); // "mbasic" -> "basic"

        if (kind === 'fdet') {
            const state = ui.getDraft(userId, row.id, 'f');
            if (!state) { await expired(fieldsView); return true; }
            state.draft.name = clean(interaction.fields.getTextInputValue('name'));
            state.draft.value = clean(interaction.fields.getTextInputValue('value'));
            await show(interaction, ui.fieldSetupScreen(row, ctx, ui.setDraft(userId, row.id, state, 'f')));
            return true;
        }

        if (kind === 'bdet') {
            const state = ui.getDraft(userId, row.id);
            if (!state) { await expired(); return true; }

            const d = state.draft;
            const notes = [];
            d.label = interaction.fields.getTextInputValue('label').trim();

            const em = interaction.fields.getTextInputValue('emoji').trim();
            if (!em) delete d.emoji;
            else if (isEmoji(em)) d.emoji = em;
            else notes.push(warn('That emoji wasn\'t recognised.'));

            if (d.style === 'link') {
                const url = interaction.fields.getTextInputValue('url').trim();
                if (!url) delete d.url;
                else if (isUrlOrVar(url)) d.url = url;
                else notes.push(warn('The link must start with `https://`.'));
            } else if (d.action === 'reply') {
                const text = interaction.fields.getTextInputValue('text').trim();
                text ? (d.text = text) : delete d.text;
            }

            await show(interaction, await ui.setupScreen(row, ctx, ui.setDraft(userId, row.id, state), notes.join('\n')));
            return true;
        }

        const text = await applyModal(kind, interaction, row);
        await row.reload();
        await show(interaction, ui.mainScreen(row, ctx, text));
        return true;
    }

    // ----- main screen & managers -----
    switch (action) {
        case 'menu': {
            const value = interaction.values[0];
            if (['basic', 'author', 'footer', 'images'].includes(value)) {
                await interaction.showModal(modalFor(value, row));
            } else if (value === 'timestamp') {
                await saveData(row, d => { d.timestamp = !d.timestamp; });
                await interaction.update(main(ok(`Timestamp ${row.data.timestamp ? 'on' : 'off'}.`)));
            } else if (value === 'fields') {
                await interaction.update(fieldsView());
            } else if (value === 'buttons') {
                await interaction.update(buttonsView());
            }
            return true;
        }

        case 'home':
            await interaction.update(main());
            return true;

        case 'close':
            await interaction.update({ content: ok(`Saved **${row.name}**.`), components: [] });
            return true;

        case 'prev': {
            const payload = renderEmbed(row, ctx);
            if (!payload) { await fail(interaction, 'This embed is empty. Add something first.'); return true; }
            await interaction.reply({ ...payload, allowedMentions: noPing, flags: EPHEMERAL });
            return true;
        }

        case 'vars':
            await interaction.reply(ui.variablesMessage());
            return true;

        case 'send': {
            const sendable = [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(interaction.channel?.type);
            await interaction.update(ui.sendScreen(row, ctx, sendable ? interaction.channelId : null));
            return true;
        }

        case 'sendto': {
            const channel = guild.channels.cache.get(interaction.values[0]);
            const res = await sendSavedEmbed(channel, row, ctx, { actor: interaction.member });
            await interaction.update(main(res.ok
                ? ok(`Sent to <#${channel.id}> · [jump](${res.message.url})`)
                : `${emojis.error} ${res.error}`));
            return true;
        }

        // ----- fields manager -----
        case 'fsel': {
            const f = (row.data.fields ?? []).find(x => x.id === interaction.values[0]);
            if (!f) { await interaction.update(fieldsView(warn('That field no longer exists.'))); return true; }
            const state = ui.setDraft(userId, row.id, { draft: structuredClone(f), editingId: f.id }, 'f');
            await interaction.update(ui.fieldSetupScreen(row, ctx, state));
            return true;
        }

        case 'fadd': {
            if ((row.data.fields?.length ?? 0) >= MAX_FIELDS) {
                await interaction.update(fieldsView(warn(`Max ${MAX_FIELDS} fields.`)));
                return true;
            }
            const state = ui.setDraft(userId, row.id, { draft: { id: newId(), inline: false }, editingId: null }, 'f');
            await interaction.showModal(modalFor('fdet', row, state.draft));
            return true;
        }

        // ----- buttons manager -----
        case 'bsel': {
            const b = (row.data.buttons ?? []).find(x => x.id === interaction.values[0]);
            if (!b) { await interaction.update(buttonsView(warn('That button no longer exists.'))); return true; }
            const state = ui.setDraft(userId, row.id, { draft: structuredClone(b), editingId: b.id });
            await interaction.update(await ui.setupScreen(row, ctx, state));
            return true;
        }

        case 'badd': {
            if ((row.data.buttons?.length ?? 0) >= MAX_BUTTONS) {
                await interaction.update(buttonsView(warn(`Max ${MAX_BUTTONS} buttons.`)));
                return true;
            }
            const state = ui.setDraft(userId, row.id, { draft: { id: newId(), style: 'link' }, editingId: null });
            await interaction.update(await ui.setupScreen(row, ctx, state));
            return true;
        }

        case 'bclear':
            await interaction.update(buttonsView('', true));
            return true;

        case 'bclearok':
            await saveData(row, d => { d.buttons = []; });
            await interaction.update(buttonsView(ok('All buttons removed.')));
            return true;
    }

    // ----- single field editor -----
    if (action.startsWith('f')) {
        const state = ui.getDraft(userId, row.id, 'f');
        if (!state) { await expired(fieldsView); return true; }
        const d = state.draft;
        const redraw = text => interaction.update(ui.fieldSetupScreen(row, ctx, state, text));

        switch (action) {
            case 'flayout':
                d.inline = interaction.values[0] === 'inline';
                await redraw();
                return true;

            case 'fdet':
                await interaction.showModal(modalFor('fdet', row, d));
                return true;

            case 'fsave': {
                if (ui.fieldProblem(d)) { await redraw(warn(ui.fieldProblem(d))); return true; }
                const final = { id: d.id, name: d.name, value: d.value, inline: !!d.inline };
                const data = await saveData(row, x => {
                    const i = x.fields.findIndex(f => f.id === state.editingId);
                    if (i >= 0) x.fields[i] = final; else x.fields.push(final);
                });
                ui.clearDraft(userId, row.id, 'f');
                await interaction.update(fieldsView(rawLength(data) > LIMITS.total
                    ? warn(`Saved, but the embed is over ${LIMITS.total} characters so some text will be cut.`)
                    : ok('Field saved.')));
                return true;
            }

            case 'fup':
            case 'fdown': {
                const dir = action === 'fup' ? -1 : 1;
                await saveData(row, x => {
                    const i = x.fields.findIndex(f => f.id === state.editingId);
                    const j = i + dir;
                    if (i >= 0 && j >= 0 && j < x.fields.length) [x.fields[i], x.fields[j]] = [x.fields[j], x.fields[i]];
                });
                await redraw(ok('Moved.'));
                return true;
            }

            case 'fdel':
                await saveData(row, x => { x.fields = x.fields.filter(f => f.id !== state.editingId); });
                ui.clearDraft(userId, row.id, 'f');
                await interaction.update(fieldsView(ok('Field removed.')));
                return true;

            case 'fcancel':
                ui.clearDraft(userId, row.id, 'f');
                await interaction.update(fieldsView());
                return true;
        }
        return false;
    }

    // ----- single button editor -----
    const state = ui.getDraft(userId, row.id);
    if (!state) { await expired(); return true; }

    const d = state.draft;
    const redraw = async text => interaction.update(await ui.setupScreen(row, ctx, state, text));

    switch (action) {
        case 'bstyle':
            d.style = interaction.values[0];
            if (d.style !== 'link' && !d.action) d.action = 'reply';
            await redraw();
            return true;

        case 'bact':
            d.action = interaction.values[0];
            if (!d.action.startsWith('role_')) delete d.roleId;
            if (d.action !== 'embed') delete d.embedName;
            await redraw();
            return true;

        case 'brole': {
            const role = guild.roles.cache.get(interaction.values[0]);
            const problem = roleProblem(guild, role, interaction.member);
            if (problem) { delete d.roleId; await redraw(warn(problem)); }
            else { d.roleId = role.id; await redraw(); }
            return true;
        }

        case 'bemb':
            d.embedName = interaction.values[0];
            await redraw();
            return true;

        case 'bdet':
            await interaction.showModal(modalFor('bdet', row, d));
            return true;

        case 'bsave': {
            const problem = ui.draftProblem(d);
            if (problem) { await redraw(warn(problem)); return true; }

            if (d.roleId) {
                const roleErr = roleProblem(guild, guild.roles.cache.get(d.roleId), interaction.member);
                if (roleErr) { await redraw(warn(roleErr)); return true; }
            }

            const final = { id: d.id, style: d.style, label: d.label || undefined, emoji: d.emoji || undefined };
            if (d.style === 'link') {
                final.url = d.url;
            } else {
                final.action = d.action;
                if (d.action === 'reply') final.text = d.text;
                if (d.action === 'embed') final.embedName = d.embedName;
                if (d.action.startsWith('role_')) final.roleId = d.roleId;
            }

            await saveData(row, data => {
                const i = data.buttons.findIndex(b => b.id === state.editingId);
                if (i >= 0) data.buttons[i] = final; else data.buttons.push(final);
            });
            ui.clearDraft(userId, row.id);
            await interaction.update(buttonsView(ok('Button saved.')));
            return true;
        }

        case 'bdel':
            await saveData(row, data => { data.buttons = data.buttons.filter(b => b.id !== state.editingId); });
            ui.clearDraft(userId, row.id);
            await interaction.update(buttonsView(ok('Button removed.')));
            return true;

        case 'bcancel':
            ui.clearDraft(userId, row.id);
            await interaction.update(buttonsView());
            return true;
    }

    return false;
}

/* ---------- buttons on sent embeds ---------- */

async function handleEmbedButton(interaction) {
    const [, rawId, buttonId] = interaction.customId.split(':');
    const gone = () => interaction.reply(ui.notice('This button is no longer available.'));

    if (!interaction.inGuild()) return gone();
    const row = await Embed.findByPk(Number(rawId));
    if (!row || row.guildId !== interaction.guildId) return gone();
    const b = (row.data?.buttons ?? []).find(x => x.id === buttonId);
    if (!b) return gone();

    const ctx = ctxFromInteraction(interaction);

    if (b.action === 'reply') {
        return interaction.reply({
            content: applyVars(b.text ?? '', ctx).slice(0, 2000) || '\u200b',
            allowedMentions: noPing,
            flags: EPHEMERAL,
        });
    }

    if (b.action === 'embed') {
        const target = await findEmbed(interaction.guildId, b.embedName);
        const payload = target && renderEmbed(target, ctx);
        if (!payload) return interaction.reply(ui.notice('That embed is no longer available.', false));
        return interaction.reply({ ...payload, allowedMentions: noPing, flags: EPHEMERAL });
    }

    if (b.action?.startsWith('role_')) {
        await interaction.deferReply({ flags: EPHEMERAL });
        const guild = interaction.guild;
        const role = guild.roles.cache.get(b.roleId);
        const problem = roleProblem(guild, role);
        if (problem) return interaction.editReply({ content: `${emojis.error} This button is misconfigured. ${problem}` });

        const member = interaction.member;
        const has = member.roles.cache.has(role.id);
        const wantAdd = b.action === 'role_add' || (b.action === 'role_toggle' && !has);

        try {
            if (wantAdd) {
                if (has) return interaction.editReply({ content: `You already have <@&${role.id}>.`, allowedMentions: noPing });
                await member.roles.add(role, 'Embed button');
                return interaction.editReply({ content: ok(`Added <@&${role.id}>.`), allowedMentions: noPing });
            }
            if (!has) return interaction.editReply({ content: `You don't have <@&${role.id}>.`, allowedMentions: noPing });
            await member.roles.remove(role, 'Embed button');
            return interaction.editReply({ content: ok(`Removed <@&${role.id}>.`), allowedMentions: noPing });
        } catch (err) {
            return interaction.editReply({ content: `${emojis.error} I couldn't change that role.` });
        }
    }

    return gone();
}

/* ---------- entry ---------- */

module.exports = {
    async handle(interaction) {
        const id = interaction.customId;
        if (!id) return false;
        if (id.startsWith('embtn:') && interaction.isButton()) { await handleEmbedButton(interaction); return true; }
        if (id.startsWith('emb:')) return handleBuilder(interaction);
        return false;
    },
};
