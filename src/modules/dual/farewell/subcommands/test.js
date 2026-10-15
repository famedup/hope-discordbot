// ─── cashholy (carti) · developer ───

const emojis = require('../../../../media/emojis.json');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { FarewellConfig } = require('../../../../database/schemas');

function replacePlaceholders(text, member) {
    if (!text) return text;
    
    const joinDate = member.joinedAt;
    const createDate = member.user.createdAt;
    
    const formatDate = (date) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return text
        .replace(/\{mention\}/g, `<@${member.id}>`)
        .replace(/\{avatar\}/g, member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .replace(/\{user\}/g, member.user.username)
        .replace(/\{user_nick\}/g, member.displayName || member.user.username)
        .replace(/\{joindate\}/g, formatDate(joinDate))
        .replace(/\{user_createdate\}/g, formatDate(createDate))
        .replace(/\{server\}/g, member.guild.name)
        .replace(/\{count\}/g, member.guild.memberCount.toString())
        .replace(/\{server_icon\}/g, member.guild.iconURL({ dynamic: true, size: 256 }) || '');
}

module.exports = {
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        const config = await FarewellConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emojis.cross} No Farewell Configuration`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('There is no farewell configuration set up for this server.\n\nUse `farewell setup` to configure farewell messages.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (config.type === 'simple') {
            if (!config.message) {
                const noMsgContainer = new ContainerBuilder().setAccentColor(0xED4245)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${emojis.cross} No Message Set`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('The farewell message has not been configured yet.\n\nUse `farewell setup` to set a message.')
                    );

                return interactionOrMessage.reply({
                    components: [noMsgContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const infoContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Farewell Message Preview')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# This is a preview of the farewell message using your profile:')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(replacePlaceholders(config.message, member))
                );

            return interactionOrMessage.reply({
                components: [infoContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        } else {
            const previewContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Farewell Message Preview')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# This is a preview of the farewell message using your profile:')
                );

            const container = new ContainerBuilder();

            if (config.color) {
                container.setAccentColor(config.color);
            }

            const title = replacePlaceholders(config.title || 'Farewell', member);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${title}`)
            );

            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

            const description = replacePlaceholders(config.description || `Goodbye from ${guild.name}!`, member);
            const thumbnailUrl = replacePlaceholders(config.thumbnailUrl, member);

            if (thumbnailUrl) {
                const section = new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(description)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(thumbnailUrl)
                    );
                container.addSectionComponents(section);
            } else {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(description)
                );
            }

            const imageUrl = replacePlaceholders(config.imageUrl, member);
            if (imageUrl) {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(imageUrl)
                    )
                );
            }

            return interactionOrMessage.reply({
                components: [previewContainer, container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
    }
};
