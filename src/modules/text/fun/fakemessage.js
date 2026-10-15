/**
 * ┌ cashholy (carti)
 * └ modules/text/fun/fakemessage.js
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
} = require('discord.js');
const FakeMessageCard = require('../../../services/FakeMessageCard');

module.exports = {
    name: 'fakemessage',
    description: 'Generate a fake Discord message card',
    aliases: ['fakemsg', 'fmsg', 'fakedm'],
    usage: 'fakemessage <@user> <message> [theme]',
    cooldown: 10,

    async execute(message, args) {
        if (args.length < 2) {
            const themes = FakeMessageCard.getThemes();
            const themeList = Object.entries(themes)
                .map(([key, value]) => `\`${key}\` - ${value.name}`)
                .join('\n');

            const helpContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Fake Message Command')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '**Usage:** `fakemessage <@user> <message> [theme]`\n\n' +
                        '**Available Themes:**\n' + themeList + '\n\n' +
                        '**Example:** `fakemessage @User Hello World! dark`'
                    )
                );

            return message.reply({
                components: [helpContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        let targetUser;

        if (mentionMatch) {
            try {
                targetUser = await message.client.users.fetch(mentionMatch[1], { force: true });
            } catch (error) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Could not find the specified user.')
                    );
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                });
            }
        } else if (/^\d{17,19}$/.test(args[0])) {
            try {
                targetUser = await message.client.users.fetch(args[0], { force: true });
            } catch (error) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Could not find the specified user.')
                    );
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                });
            }
        } else {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Please mention a user or provide a valid user ID.')
                );
            return message.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const themes = FakeMessageCard.getThemes();
        const themeKeys = Object.keys(themes);
        
        let theme = 'dark';
        let messageText = '';
        
        const lastArg = args[args.length - 1].toLowerCase();
        if (themeKeys.includes(lastArg)) {
            theme = lastArg;
            messageText = args.slice(1, -1).join(' ');
        } else {
            messageText = args.slice(1).join(' ');
        }

        if (!messageText.trim()) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Please provide a message to display.')
                );
            return message.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (messageText.length > 500) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Message is too long. Maximum 500 characters allowed.')
                );
            return message.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const processingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Generating fake message card...')
            );

        const processingMsg = await message.reply({
            components: [processingContainer],
            flags: MessageFlags.IsComponentsV2,
        });

        try {
            const avatarURL = targetUser.displayAvatarURL({
                extension: 'png',
                size: 512,
                forceStatic: true,
            });

            let avatarDecorationURL = null;
            if (targetUser.avatarDecorationData) {
                avatarDecorationURL = targetUser.avatarDecorationURL({ size: 512 });
            }

            const imageBuffer = await FakeMessageCard.generate({
                username: targetUser.displayName || targetUser.username,
                message: messageText,
                avatarURL: avatarURL,
                avatarDecorationURL: avatarDecorationURL,
                theme: theme,
                timestamp: null,
                bot: false,
                verified: false,
            });

            const attachment = new AttachmentBuilder(imageBuffer, {
                name: 'fakemessage.png',
            });

            const mediaGallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://fakemessage.png')
                    .setDescription(`Fake message by ${targetUser.username}`)
            );

            const themeName = themes[theme]?.name || 'Dark';

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Fake Message - ${themeName} Theme`)
                )
                .addMediaGalleryComponents(mediaGallery);

            return processingMsg.edit({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                files: [attachment],
            });
        } catch (error) {
            console.error('FakeMessageCommand Error:', error);

            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Failed to generate fake message card. Please try again.')
                );

            return processingMsg.edit({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
