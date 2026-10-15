/* ---
   author : cashholy (carti)
   module : github
   --- */

const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github')
        .setDescription('Search for GitHub repositories')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Repository name or keywords to search')
                .setRequired(true)
        ),

    name: 'github',
    aliases: ['gh', 'repo'],
    category: 'social',
    deferReply: true,

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const send = interactionOrMessage.deferred
            ? opts => interactionOrMessage.editReply(opts)
            : opts => interactionOrMessage.reply(opts);
        const searchQuery = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');

        if (!searchQuery) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### GitHub Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    'Usage: `github <repo name>`'
                ));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const searchResults = await axios.get('https://api.github.com/search/repositories', {
                params: { q: searchQuery, sort: 'stars', order: 'desc', per_page: 10 },
                headers: { 'User-Agent': 'Discord-Bot' }
            });

            const repos = searchResults.data.items;

            if (!repos || repos.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### GitHub Search'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `No repositories found for **${searchQuery}**.`
                    ));
                return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const reposList = repos.slice(0, 5).map((repo, index) => {
                const stars = repo.stargazers_count.toLocaleString();
                const forks = repo.forks_count.toLocaleString();
                const lang = repo.language || 'N/A';
                return `**${index + 1}. ${repo.name}** (${stars} stars)\n` +
                       `${repo.description || 'No description'}\n` +
                       `Language: ${lang} | Forks: ${forks}\n` +
                       `[View Repository](${repo.html_url})`;
            }).join('\n\n');

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# GitHub Search - ${searchQuery}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(reposList))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `Found ${searchResults.data.total_count.toLocaleString()} total repositories`
                ));

            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('GitHub search error:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### GitHub Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    'Failed to reach GitHub. Please try again later.'
                ));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
