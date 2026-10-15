/*! © 2026 cashholy (carti) !*/

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { loadImage } = require('@napi-rs/canvas');
const Profile = require('../../../../database/schemas/Profile');
const emojis = require('../../../../media/emojis.json');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        let imageLink;
        if (isSlashCommand) {
            imageLink = interactionOrMessage.options.getString('image');
        } else {
            imageLink = args[0];
        }

        if (!imageLink) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Missing Image Link')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Please provide an image link for your profile background.\n\n' +
                        '**Usage:** `profile background <image_url>`\n' +
                        '**Example:** `profile background https://i.imgur.com/example.png`\n\n' +
                        '**Note:** Use a permanent image host like Imgur. Discord attachment URLs expire!'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!imageLink.startsWith('http://') && !imageLink.startsWith('https://')) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Invalid Image Link')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Please provide a valid image URL starting with http:// or https://'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const lowerLink = imageLink.toLowerCase();
        if (lowerLink.endsWith('.gif') || lowerLink.includes('.gif?')) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# GIF Not Supported')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Animated GIFs are not supported for profile backgrounds.\n\n' +
                        'Please use a static image format: **PNG**, **JPG**, or **WebP**'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            await loadImage(imageLink);
        } catch (err) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Failed to Load Image')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Could not load the image from the provided URL.\n\n' +
                        '**Possible reasons:**\n' +
                        '- The URL is invalid or expired\n' +
                        '- Discord attachment URLs expire - use Imgur instead\n' +
                        '- The image format is not supported\n\n' +
                        '**Tip:** Upload your image to [Imgur](https://imgur.com) and use that link.'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            await Profile.setBackground(userId, imageLink);

            const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Your profile background has been updated.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile background error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Database Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Failed to update your profile background. Please try again later.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
