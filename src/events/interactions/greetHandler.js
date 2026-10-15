// ─── cashholy (carti) · developer ───

// Interaction handler for the welcome / farewell / boost panels.
//   greet:<action>:<kind>   kind = welcome | farewell | boost

const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} = require('discord.js');
const kit = require('../../services/ui');
const G = require('../../services/greeter');
const { Greeting, WelcomeConfig, FarewellConfig, GuildConfig } = require('../../database/schemas');
const { ctxFromMember } = require('../../services/embedVars');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const NO_PING = { parse: [] };

const say = (i, component) => i.reply({ components: [component], flags: V2 | EPHEMERAL, allowedMentions: NO_PING });

/** Redraw the panel in place. */
async function redraw(interaction, kind, note = '') {
    const row = await G.read(interaction.guildId, kind);
    const legacy = !row && !!(await G.legacyOf(interaction.guildId, kind));
    const components = await G.panel(interaction.guild, kind, row, { member: interaction.member, note, legacy });
    return interaction.update({ components, flags: V2, allowedMentions: NO_PING });
}

async function change(interaction, kind, patch) {
    const row = await G.ensure(interaction.guildId, kind);
    await row.update(patch);
    G.bust(interaction.guildId, kind);
    return row;
}

async function resetAll(guildId, kind) {
    await Greeting.destroy({ where: { guildId, kind } });
    G.bust(guildId, kind);
    if (kind === 'welcome') {
        await WelcomeConfig.destroy({ where: { guildId } });
        await GuildConfig.update({ welcomeInOn: false }, { where: { guildId } });
    } else if (kind === 'farewell') {
        await FarewellConfig.destroy({ where: { guildId } });
        await GuildConfig.update({ welcomeOutOn: false }, { where: { guildId } });
    }
}

async function handle(interaction) {
    const id = interaction.customId;
    if (!id?.startsWith('greet:')) return false;

    const [, action, kind] = id.split(':');
    if (!G.KINDS[kind]) return false;
    if (!interaction.inGuild()) return true;
    if (!G.canManage(interaction.member)) { await say(interaction, kit.fail('You need the **Manage Server** permission.')); return true; }

    const meta = G.KINDS[kind];
    const value = interaction.values?.[0];

    /* ----- modal ----- */
    if (interaction.isModalSubmit()) {
        if (action !== 'm_msg') return true;
        const text = interaction.fields.getTextInputValue('message').trim().slice(0, G.MAX_MESSAGE);
        if (!text) { await say(interaction, kit.fail('The message can\'t be empty.')); return true; }
        await change(interaction, kind, { message: text });
        await redraw(interaction, kind, `${kit.emojis.success} Message saved.`);
        return true;
    }

    switch (action) {
        case 'toggle': {
            const row = await G.read(interaction.guildId, kind);
            if (!row?.enabled && !row?.channelId) { await say(interaction, kit.warn('Pick a channel first.')); return true; }
            const nowOn = !row?.enabled;
            await change(interaction, kind, { enabled: nowOn });
            await redraw(interaction, kind, nowOn ? `${kit.emojis.success} ${meta.title} is on.` : `${meta.title} is off.`);
            return true;
        }
        case 'channel': {
            const channel = interaction.channels?.first();
            await change(interaction, kind, { channelId: channel?.id ?? null });
            await redraw(interaction, kind);
            return true;
        }
        case 'attach': {
            const row = await G.ensure(interaction.guildId, kind);
            const text = G.bare(row.message ?? '');
            let message = text;
            if (value?.startsWith('e:')) message = `${text} {embed:${value.slice(2)}}`.trim();
            if (value?.startsWith('c:')) message = `${text} {container:${value.slice(2)}}`.trim();
            await change(interaction, kind, { message });
            await redraw(interaction, kind);
            return true;
        }
        case 'auto': {
            await change(interaction, kind, { autoDelete: Number(value) || 0 });
            await redraw(interaction, kind);
            return true;
        }
        case 'msg': {
            const row = await G.read(interaction.guildId, kind);
            const modal = new ModalBuilder().setCustomId(`greet:m_msg:${kind}`).setTitle(`${meta.title} message`)
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('message').setLabel('Message (variables and tags work)')
                        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(G.MAX_MESSAGE)
                        .setValue((row?.message ?? meta.def).slice(0, G.MAX_MESSAGE))
                        .setPlaceholder('Welcome {user} to **{server}**!'),
                ));
            await interaction.showModal(modal);
            return true;
        }
        case 'prev': {
            const row = await G.read(interaction.guildId, kind);
            const ctx = ctxFromMember(interaction.member, interaction.channel);
            const out = await G.compose(interaction.guild, row?.message ?? meta.def, ctx);
            if (!out.payload) { await say(interaction, kit.warn(out.problem ?? 'Nothing to show.')); return true; }
            await interaction.reply({ ...out.payload, flags: (out.payload.flags ?? 0) | EPHEMERAL, allowedMentions: NO_PING });
            if (out.problem) await interaction.followUp({ components: [kit.warn(out.problem)], flags: V2 | EPHEMERAL, allowedMentions: NO_PING });
            return true;
        }
        case 'vars': {
            await interaction.reply({ components: await G.variablesCard(interaction.guild, kind), flags: V2 | EPHEMERAL, allowedMentions: NO_PING });
            return true;
        }
        case 'vgroup': {
            await interaction.update({ components: await G.variablesCard(interaction.guild, kind, value), flags: V2, allowedMentions: NO_PING });
            return true;
        }
        case 'reset':
            await interaction.update({ components: G.confirmReset(kind), flags: V2 });
            return true;
        case 'no':
            await redraw(interaction, kind);
            return true;
        case 'yes':
            await resetAll(interaction.guildId, kind);
            await redraw(interaction, kind, `${kit.emojis.success} ${meta.title} was reset.`);
            return true;
    }
    return false;
}

module.exports = { handle };
