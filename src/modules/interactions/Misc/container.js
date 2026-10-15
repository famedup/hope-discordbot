/* ---
   author : cashholy (carti)
   module : container
   --- */

// /container — build, save, edit, send and delete container messages (slash only).
// Saved containers can be used in welcome and farewell messages as {container:name}.

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const kit = require('../../../services/ui');
const { Container } = require('../../../database/schemas');
const { ctxFromInteraction } = require('../../../services/embedVars');
const R = require('../../../services/containerRender');
const ui = require('../../../services/containerUi');
const { findContainer, sendSavedContainer } = require('../../../services/containerSend');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const nameCache = new Map(); // guildId -> { ts, names } for autocomplete

const containerOption = (o, desc = 'name of the container') =>
    o.setName('container').setDescription(desc).setRequired(true).setAutocomplete(true);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('container')
        .setDescription('Build and manage container messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addSubcommand(s => s.setName('create').setDescription('Create a new container message')
            .addStringOption(o => o.setName('name').setDescription('short name, no spaces (max 16 characters)').setRequired(true).setMaxLength(16)))
        .addSubcommand(s => s.setName('edit').setDescription('Open the builder for a container')
            .addStringOption(o => containerOption(o, 'name of the container to edit')))
        .addSubcommand(s => s.setName('send').setDescription('Send a container to a channel')
            .addStringOption(o => containerOption(o, 'name of the container to send'))
            .addChannelOption(o => o.setName('channel').setDescription('where to send it (default: this channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(o => o.setName('message').setDescription('optional text above the containers, supports variables').setMaxLength(2000)))
        .addSubcommand(s => s.setName('preview').setDescription('See a container just for you')
            .addStringOption(o => containerOption(o, 'name of the container')))
        .addSubcommand(s => s.setName('copy').setDescription('Duplicate a container under a new name')
            .addStringOption(o => containerOption(o, 'name of the container to copy'))
            .addStringOption(o => o.setName('name').setDescription('name for the copy').setRequired(true).setMaxLength(16)))
        .addSubcommand(s => s.setName('delete').setDescription('Delete a container')
            .addStringOption(o => containerOption(o, 'name of the container to delete')))
        .addSubcommand(s => s.setName('list').setDescription('View all containers in this server'))
        .addSubcommand(s => s.setName('variables').setDescription('See every variable you can use in containers')),

    async execute(interaction) {
        // Acknowledge right away: database lookups can outlast Discord's 3-second window.
        await interaction.deferReply({ flags: EPHEMERAL });
        const respond = (components) => interaction.editReply({ components: [].concat(components), flags: V2 });

        if (!interaction.inGuild() || !interaction.guild) return respond(kit.fail('This command can only be used inside a server.'));
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) return respond(kit.fail('You need the **Manage Messages** permission.'));

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const ctx = ctxFromInteraction(interaction);

        /* ----- variables ----- */
        if (sub === 'variables') {
            const m = ui.variablesMessage();
            return interaction.editReply({ components: m.components, flags: V2 });
        }

        /* ----- list ----- */
        if (sub === 'list') {
            const rows = await Container.findAll({ where: { guildId }, order: [['name', 'ASC']] });
            if (!rows.length) return respond(kit.info('No containers yet. Make one with `/container create`.'));
            const lines = rows.map(r => {
                const d = R.normalize(r.data);
                const blocks = d.containers.reduce((n, c) => n + c.blocks.length, 0);
                return `\`${r.name}\` · ${d.containers.length} container${d.containers.length === 1 ? '' : 's'} · ${blocks} block${blocks === 1 ? '' : 's'} · <t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`;
            });
            return respond(kit.card({ title: 'Containers', lines, footer: `${rows.length}/${R.MAX_CONTAINERS_PER_GUILD} used` }));
        }

        /* ----- create / copy name checks ----- */
        const claimName = async (raw) => {
            const name = String(raw).trim();
            if (!R.NAME_RE.test(name)) throw new Error('Names can only use letters, numbers, `-` and `_` (max 16, no spaces).');
            if (await findContainer(guildId, name)) throw new Error(`A container named \`${name.toLowerCase()}\` already exists.`);
            if (await Container.count({ where: { guildId } }) >= R.MAX_CONTAINERS_PER_GUILD) {
                throw new Error(`This server has reached the limit of **${R.MAX_CONTAINERS_PER_GUILD}** containers. Delete one first.`);
            }
            nameCache.delete(guildId);
            return name.toLowerCase();
        };

        if (sub === 'create') {
            let name;
            try { name = await claimName(interaction.options.getString('name')); } catch (e) { return respond(kit.fail(e.message)); }
            const row = await Container.create({ guildId, name, data: R.emptyData(), createdBy: interaction.user.id });
            const st = ui.getState(interaction.user.id, row.id);
            Object.assign(st, { mode: 'main', ci: 0, bi: null, bt: null, draft: null, pending: null });
            const screen = ui.screen(row, st, ctx, { note: `Created **${row.name}**.` });
            return interaction.editReply({ components: screen.components, flags: V2 });
        }

        /* ----- everything below needs an existing container ----- */
        const wanted = interaction.options.getString('container');
        const row = await findContainer(guildId, wanted);
        if (!row) return respond(kit.fail(`No container named \`${String(wanted).toLowerCase()}\`. Check \`/container list\`.`));

        if (sub === 'edit') {
            const st = ui.getState(interaction.user.id, row.id);
            Object.assign(st, { mode: 'main', ci: 0, bi: null, bt: null, draft: null, pending: null });
            const screen = ui.screen(row, st, ctx);
            return interaction.editReply({ components: screen.components, flags: V2 });
        }

        if (sub === 'copy') {
            let name;
            try { name = await claimName(interaction.options.getString('name')); } catch (e) { return respond(kit.fail(e.message)); }
            const data = R.normalize(structuredClone(row.data));
            for (const c of data.containers) for (const b of c.blocks) {
                b.id = R.newBlockId();
                for (const bt of (b.buttons ?? [])) bt.id = R.newButtonId();
                if (b.accessory?.button) b.accessory.button.id = R.newButtonId();
            }
            await Container.create({ guildId, name, data, createdBy: interaction.user.id });
            return respond(kit.success(`Copied **${row.name}** to **${name}**`));
        }

        if (sub === 'delete') {
            nameCache.delete(guildId);
            await row.destroy();
            return respond(kit.success(`Deleted **${row.name}**`));
        }

        if (sub === 'preview') {
            const parts = R.renderContainers(row, ctx, { preview: true });
            return interaction.editReply({ components: parts, flags: V2, allowedMentions: { parse: [] } });
        }

        if (sub === 'send') {
            const channel = interaction.options.getChannel('channel') ?? interaction.channel;
            const content = interaction.options.getString('message');
            const res = await sendSavedContainer(channel, row, ctx, { content, actor: interaction.member });
            if (!res.ok) return respond(kit.fail(res.error));
            return respond(kit.success(`Sent **${row.name}** to <#${channel.id}> · [jump](${res.message.url})`));
        }
    },

    async autocomplete(interaction) {
        if (!interaction.guild) return interaction.respond([]);
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'container') return interaction.respond([]);

        const guildId = interaction.guild.id;
        let hit = nameCache.get(guildId);
        if (!hit || Date.now() - hit.ts > 10000) {
            const rows = await Container.findAll({ where: { guildId }, attributes: ['name'], order: [['name', 'ASC']] });
            hit = { ts: Date.now(), names: rows.map(r => r.name) };
            nameCache.set(guildId, hit);
        }
        const query = String(focused.value ?? '').toLowerCase();
        return interaction.respond(hit.names.filter(n => n.includes(query)).slice(0, 25).map(n => ({ name: n, value: n })));
    },
};
