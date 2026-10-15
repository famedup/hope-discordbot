// dev: cashholy (carti) | module: youtube

const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { createPaginationSession } = require('../../../services/pagination');
const youtubesearchapi = require('youtube-search-api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('Search for YouTube videos')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query for YouTube videos')
                .setRequired(true)
        ),

    name: 'youtube',
    aliases: ['yt'],
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
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        if (!searchQuery) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `youtube <search query>`'));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const searchResults = await youtubesearchapi.GetListByKeyword(searchQuery, false, 25);
            const videos = searchResults?.items?.filter(item => item.type === 'video') || [];

            if (videos.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `No videos found for **${searchQuery}**.`
                    ));
                return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const totalPages = videos.length;
            const fetchPage = async (pageIndex) => [videos[pageIndex]];

            const renderPage = async (pageIndex, pageVideos) => {
                const video = pageVideos[0];
                const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
                const channelName = video.channelTitle || 'Unknown Channel';
                const duration = video.length?.simpleText || 'N/A';
                const title = video.title || 'No Title';

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### [${title}](${videoUrl})\n-# ${channelName} · ${duration} · ${pageIndex + 1}/${totalPages}`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                if (video.thumbnail?.thumbnails?.length > 0) {
                    const thumbnailUrl = video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].url;
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems([
                            new MediaGalleryItemBuilder().setURL(thumbnailUrl).setDescription(title.substring(0, 100))
                        ])
                    );
                }

                return container;
            };

            await createPaginationSession({
                interactionOrMessage,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000
            }).renderInitial();

        } catch (error) {
            console.error('YouTube search error:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to search YouTube. Please try again later.'));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
