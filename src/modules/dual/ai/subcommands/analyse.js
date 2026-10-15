/**
 * @file analyse.js
 * @developer cashholy (carti)
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require('discord.js');
const {
    hasApiKey,
    makeApiRequest,
    processAiResponse
} = require('../../../../services/aiUtils');
const emojis = require('../../../../media/emojis.json');
const config = require('../../../../settings');

module.exports = {
    name: 'analyse',
    description: 'Analyze an image using AI vision',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        if (!hasApiKey()) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nAI service is not configured.')
                );

            return await interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let attachment;
        let prompt;

        if (isSlashCommand) {
            attachment = interactionOrMessage.options.getAttachment('image');
            prompt = interactionOrMessage.options.getString('prompt') || 'Describe this image in detail.';
        } else {
            prompt = args.join(' ') || 'Describe this image in detail.';
            attachment = interactionOrMessage.attachments.first();

            if (!attachment && interactionOrMessage.reference) {
                try {
                    const repliedMessage = await interactionOrMessage.channel.messages.fetch(interactionOrMessage.reference.messageId);
                    if (repliedMessage.attachments.size > 0) {
                        attachment = repliedMessage.attachments.first();
                    }
                } catch (err) {
                    console.error('Error fetching replied message:', err);
                }
            }
        }

        if (!attachment) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nPlease attach an image or reply to a message with an image.')
                );

            return await interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(attachment.contentType)) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nPlease provide a valid image file (PNG, JPG, GIF, or WebP).')
                );

            return await interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let thinkingMsg = null;
        if (isSlashCommand) {
            await interactionOrMessage.deferReply();
        } else {
            thinkingMsg = await interactionOrMessage.reply(`${emojis.loading} Analyzing image...`);
        }

        try {
            const imageResponse = await fetch(attachment.url);
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const mimeType = attachment.contentType;

            const visionPrompt = `You are ${interactionOrMessage.client.user.username}, an AI assistant by ${config.BOT_NAME}. Analyze this image and respond to the user's request. Never mention other AI models or companies.

User's request: ${prompt}`;

            const messages = [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: visionPrompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ];

            const result = await makeApiRequest(messages, {
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                maxTokens: 1024
            });

            if (!result.success) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Error**\n\nFailed to analyze image. ${result.error || 'Please try again later.'}`)
                    );

                if (isSlashCommand) {
                    return await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                } else {
                    return await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
                }
            }

            let analysisResult = processAiResponse(result.content);

            const container = new ContainerBuilder().setAccentColor(0x2B2D31);

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Image Analysis')
            );
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(attachment.url)
                        .setDescription('Analyzed Image')
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

            if (prompt !== 'Describe this image in detail.') {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Your Question:** ${prompt}`)
                );
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );
            }

            let resultText = analysisResult;
            if (resultText.length > 3900) {
                resultText = resultText.substring(0, 3900) + '...';
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Analysis:**\n${resultText}`)
            );

            if (isSlashCommand) {
                await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
            }

        } catch (error) {
            console.error('Analyse command error:', error);

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error**\n\nAn unexpected error occurred while analyzing the image.')
                );

            if (isSlashCommand) {
                await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }
    }
};
