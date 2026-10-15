const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../../../settings');

// Extra links: fill in any you want shown. Empty / invalid URLs are skipped,
// so leaving one blank never breaks the command.
const EXTRA_LINKS = [
    { label: 'Website',        url: config.WEBSITE },
    { label: 'Vote',           url: '' },
    { label: 'Terms',          url: '' },
    { label: 'Privacy Policy', url: '' },
];

const isUrl = (u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u);

function buildLinkRows(clientId) {
    const links = [
        { label: 'Invite',         url: `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&integration_type=0&scope=bot+applications.commands` },
        { label: 'Support Server', url: config.SUPPORT_SERVER },
        ...EXTRA_LINKS,
    ].filter(l => isUrl(l.url));

    const rows = [];
    for (let i = 0; i < links.length && rows.length < 5; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(
            links.slice(i, i + 5).map(l =>
                new ButtonBuilder().setLabel(l.label).setStyle(ButtonStyle.Link).setURL(l.url)
            )
        ));
    }
    return rows;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('links')
        .setDescription('Get all the important links'),

    name: 'links',
    aliases: ['link'],
    description: 'Get all the important links',
    category: 'information',

    async execute(interactionOrMessage) {
        const rows = buildLinkRows(interactionOrMessage.client.user.id);
        if (!rows.length) {
            return interactionOrMessage.reply({ content: 'No links have been configured yet.' });
        }
        return interactionOrMessage.reply({ components: rows });
    },

    buildLinkRows,
};
