/*! © 2026 cashholy (carti) !*/

// /embed — create, edit, send and delete custom embeds (slash only)

const {
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const emojis = require('../../../media/emojis.json');
const { Embed } = require('../../../database/schemas');
const { ctxFromInteraction } = require('../../../services/embedVars');
const {
    MAX_EMBEDS_PER_GUILD, NAME_RE, LIMITS,
    isUrlOrVar, parseColor, clean, emptyData, rawLength, renderEmbed,
} = require('../../../services/embedRender');
const { findEmbed, sendSavedEmbed } = require('../../../services/embedSend');
const ui = require('../../../services/embedUi');
const kit = require('../../../services/ui');

const EPHEMERAL = MessageFlags.Ephemeral;
const nameCache = new Map(); // guildId -> { ts, names } for autocomplete

/* ---------- command definition ---------- */

const embedOption = (o, desc = 'name of the embed') =>
    o.setName('embed').setDescription(desc).setRequired(true).setAutocomplete(true);

const edit = new SlashCommandSubcommandGroupBuilder()
    .setName('edit')
    .setDescription('Edit an existing embed')
    .addSubcommand(s => s.setName('all').setDescription('Open the full embed editor')
        .addStringOption(o => embedOption(o, 'name of the embed to edit')))
    .addSubcommand(s => s.setName('title').setDescription('Edit the title')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('title').setDescription('new title (leave blank to remove)').setMaxLength(LIMITS.title)))
    .addSubcommand(s => s.setName('description').setDescription('Edit the description')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('description').setDescription('new description, use \\n for a new line (blank to remove)').setMaxLength(LIMITS.description)))
    .addSubcommand(s => s.setName('color').setDescription('Edit the color')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('color').setDescription('hex color like #5865F2 (blank to remove)').setMaxLength(7)))
    .addSubcommand(s => s.setName('author').setDescription('Edit the author')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('text').setDescription('author text (blank to remove)').setMaxLength(LIMITS.authorName))
        .addStringOption(o => o.setName('icon').setDescription('author icon link or variable').setMaxLength(512)))
    .addSubcommand(s => s.setName('footer').setDescription('Edit the footer')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('text').setDescription('footer text (blank to remove)').setMaxLength(LIMITS.footerText))
        .addStringOption(o => o.setName('icon').setDescription('footer icon link or variable').setMaxLength(512)))
    .addSubcommand(s => s.setName('image').setDescription('Edit the large image')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('image').setDescription('image link or variable (blank to remove)').setMaxLength(512)))
    .addSubcommand(s => s.setName('thumbnail').setDescription('Edit the small thumbnail')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addStringOption(o => o.setName('image').setDescription('image link or variable (blank to remove)').setMaxLength(512)))
    .addSubcommand(s => s.setName('timestamp').setDescription('Show the time the embed was sent')
        .addStringOption(o => embedOption(o, 'name of the embed to edit'))
        .addBooleanOption(o => o.setName('timestamp').setDescription('true = add a timestamp, false = none').setRequired(true)))
    .addSubcommand(s => s.setName('fields').setDescription('Add, edit and reorder fields')
        .addStringOption(o => embedOption(o, 'name of the embed to edit')))
    .addSubcommand(s => s.setName('buttons').setDescription('Add or edit buttons')
        .addStringOption(o => embedOption(o, 'name of the embed to edit')));

/* ---------- edit helpers ---------- */

class UserError extends Error {}

function needUrl(value, what) {
    if (value && !isUrlOrVar(value)) throw new UserError(`That isn't a valid ${what} link. Use a full \`https://\` link or a variable like \`{user.avatar}\`.`);
}

// each editor mutates `d` and returns the success message
const editors = {
    title(d, o) {
        const v = clean(o.getString('title'));
        if (!v) { delete d.title; return 'Title removed.'; }
        d.title = v; return 'Title updated.';
    },
    description(d, o) {
        const v = clean(o.getString('description'));
        if (!v) { delete d.description; return 'Description removed.'; }
        d.description = v; return 'Description updated.';
    },
    color(d, o) {
        const v = (o.getString('color') ?? '').trim();
        if (!v) { delete d.color; return 'Color removed.'; }
        const c = parseColor(v);
        if (c === undefined) throw new UserError('Use a hex color like `#5865F2`.');
        d.color = c; return 'Color updated.';
    },
    author(d, o) {
        const text = clean(o.getString('text')), icon = (o.getString('icon') ?? '').trim();
        if (!text && icon) throw new UserError('An author icon needs author text too.');
        if (!text) { delete d.author; return 'Author removed.'; }
        needUrl(icon, 'icon');
        d.author = { name: text, ...(icon && { icon }) }; return 'Author updated.';
    },
    footer(d, o) {
        const text = clean(o.getString('text')), icon = (o.getString('icon') ?? '').trim();
        if (!text && icon) throw new UserError('A footer icon needs footer text too.');
        if (!text) { delete d.footer; return 'Footer removed.'; }
        needUrl(icon, 'icon');
        d.footer = { text, ...(icon && { icon }) }; return 'Footer updated.';
    },
    image(d, o) {
        const v = (o.getString('image') ?? '').trim();
        if (!v) { delete d.image; return 'Image removed.'; }
        needUrl(v, 'image'); d.image = v; return 'Image updated.';
    },
    thumbnail(d, o) {
        const v = (o.getString('image') ?? '').trim();
        if (!v) { delete d.thumbnail; return 'Thumbnail removed.'; }
        needUrl(v, 'image'); d.thumbnail = v; return 'Thumbnail updated.';
    },
    timestamp(d, o) {
        d.timestamp = o.getBoolean('timestamp');
        return d.timestamp ? 'Timestamp added.' : 'Timestamp removed.';
    },
};

const ok = text => ui.notice(text, true);
const fail = text => ui.notice(text, false);

/* ---------- command ---------- */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage custom embeds')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addSubcommand(s => s.setName('create').setDescription('Create a new embed')
            .addStringOption(o => o.setName('name').setDescription('short name, no spaces (max 16 characters)')
                .setRequired(true).setMaxLength(16)))
        .addSubcommand(s => s.setName('delete').setDescription('Delete an embed')
            .addStringOption(o => embedOption(o, 'name of the embed to delete')))
        .addSubcommand(s => s.setName('list').setDescription('View all embeds in this server'))
        .addSubcommand(s => s.setName('send').setDescription('Send an embed to a channel')
            .addStringOption(o => embedOption(o, 'name of the embed to send'))
            .addChannelOption(o => o.setName('channel').setDescription('where to send it (default: this channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(o => o.setName('message').setDescription('optional text above the embed, supports variables').setMaxLength(2000)))
        .addSubcommand(s => s.setName('variables').setDescription('See every variable you can use in embeds'))
        .addSubcommandGroup(edit),

    async execute(interaction) {
        // Acknowledge right away: the database lookups below can take longer than
        // Discord's 3-second window, which caused "Unknown interaction" errors.
        await interaction.deferReply({ flags: EPHEMERAL });
        const respond = payload => {
            const { flags, ...rest } = payload;
            const keep = (flags ?? 0) & ~EPHEMERAL; // already ephemeral from the defer
            return interaction.editReply(keep ? { ...rest, flags: keep } : rest);
        };

        if (!interaction.inGuild() || !interaction.guild) {
            return respond({ ...fail('This command can only be used inside a server.') });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            return respond({ ...fail('You need the **Manage Messages** permission.') });
        }

        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const ctx = ctxFromInteraction(interaction);

        /* ----- create ----- */
        if (!group && sub === 'create') {
            const name = interaction.options.getString('name').trim();
            if (!NAME_RE.test(name)) {
                return respond(fail('Names can only use letters, numbers, `-` and `_` (max 16, no spaces).'));
            }
            if (await findEmbed(guildId, name)) return respond(fail(`An embed named \`${name.toLowerCase()}\` already exists.`));
            if (await Embed.count({ where: { guildId } }) >= MAX_EMBEDS_PER_GUILD) {
                return respond(fail(`This server has reached the limit of **${MAX_EMBEDS_PER_GUILD}** embeds. Delete one first.`));
            }

            nameCache.delete(guildId);
            const row = await Embed.create({
                guildId, name: name.toLowerCase(), data: emptyData(), createdBy: interaction.user.id,
            });
            return respond({
                ...ui.mainScreen(row, ctx, `${emojis.success} Created **${row.name}**.`),
                flags: EPHEMERAL,
            });
        }

        /* ----- list ----- */
        if (!group && sub === 'list') {
            const rows = await Embed.findAll({ where: { guildId }, order: [['name', 'ASC']] });
            if (!rows.length) return respond(ui.notice('No embeds yet. Make one with `/embed create`.'));

            const lines = rows.map(r => {
                const f = r.data?.fields?.length ?? 0, b = r.data?.buttons?.length ?? 0;
                const bits = [f && `${f} field${f > 1 ? 's' : ''}`, b && `${b} button${b > 1 ? 's' : ''}`].filter(Boolean);
                return `\`${r.name}\`${bits.length ? ` · ${bits.join(' · ')}` : ''} · <t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`;
            });
            return respond({
                embeds: [kit.embed({
                    title: 'Embeds',
                    description: lines.join('\n'),
                    footer: `${rows.length}/${MAX_EMBEDS_PER_GUILD} used`,
                })],
                flags: EPHEMERAL,
            });
        }

        /* ----- variables ----- */
        if (!group && sub === 'variables') return respond(ui.variablesMessage());

        /* ----- everything below needs an existing embed ----- */
        const name = interaction.options.getString('embed');
        const row = await findEmbed(guildId, name);
        if (!row) return respond(fail(`No embed named \`${String(name).toLowerCase()}\`. Check \`/embed list\`.`));

        /* ----- delete ----- */
        if (!group && sub === 'delete') {
            nameCache.delete(guildId);
            await row.destroy();
            return respond(ok('Deleted embed successfully.'));
        }

        /* ----- send ----- */
        if (!group && sub === 'send') {
            const channel = interaction.options.getChannel('channel') ?? interaction.channel;
            const content = interaction.options.getString('message');
            const res = await sendSavedEmbed(channel, row, ctx, { content, actor: interaction.member });
            if (!res.ok) return respond(fail(res.error));
            return respond(ok(`Sent **${row.name}** to <#${channel.id}> · [jump](${res.message.url})`));
        }

        /* ----- edit ----- */
        if (group === 'edit') {
            if (sub === 'all') return respond({ ...ui.mainScreen(row, ctx), flags: EPHEMERAL });
            if (sub === 'fields') return respond({ ...ui.fieldsScreen(row, ctx), flags: EPHEMERAL });
            if (sub === 'buttons') return respond({ ...ui.buttonsScreen(row, ctx), flags: EPHEMERAL });

            const data = structuredClone(row.data ?? emptyData());
            let message;
            try {
                message = editors[sub](data, interaction.options);
                if (rawLength(data) > LIMITS.total) throw new UserError(`Embeds can hold ${LIMITS.total} characters in total. Shorten something first.`);
            } catch (err) {
                if (err instanceof UserError) return respond(fail(err.message));
                throw err;
            }

            await row.update({ data });
            return respond({
                content: `${emojis.success} ${message}`,
                embeds: renderEmbed(row, ctx, { preview: true }).embeds,
                flags: EPHEMERAL,
            });
        }
    },

    async autocomplete(interaction) {
        if (!interaction.guild) return interaction.respond([]);
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'embed') return interaction.respond([]);

        const guildId = interaction.guild.id;
        let hit = nameCache.get(guildId);
        if (!hit || Date.now() - hit.ts > 10000) {
            const rows = await Embed.findAll({ where: { guildId }, attributes: ['name'], order: [['name', 'ASC']] });
            hit = { ts: Date.now(), names: rows.map(r => r.name) };
            nameCache.set(guildId, hit);
        }
        const query = String(focused.value ?? '').toLowerCase();
        return interaction.respond(
            hit.names.filter(n => n.includes(query)).slice(0, 25).map(n => ({ name: n, value: n }))
        );
    },
};
