//
//  Made with care by cashholy (carti)
//

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
const { WelcomeConfig, GuildConfig } = require('../database/schemas');

const guildConfigCache = new Map();
const welcomeConfigCache = new Map();
const CACHE_TTL = 60000;

async function getGuildConfig(guildId) {
    const cached = guildConfigCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;
    const val = await GuildConfig.findOne({ where: { guildId } });
    guildConfigCache.set(guildId, { val, ts: Date.now() });
    return val;
}

async function getWelcomeConfig(guildId) {
    const cached = welcomeConfigCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;
    const val = await WelcomeConfig.findOne({ where: { guildId } });
    welcomeConfigCache.set(guildId, { val, ts: Date.now() });
    return val;
}

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
    name: 'welcomeEvent',

    async init(client) {
        client.on('guildMemberAdd', async (member) => {
            try {
                if (await require('../services/greeter').announce('welcome', member)) return;
                const guildConfig = await getGuildConfig(member.guild.id);
                if (!guildConfig || !guildConfig.welcomeInOn) return;

                const config = await getWelcomeConfig(member.guild.id);
                if (!config || !config.channelId) return;

                const channel = member.guild.channels.cache.get(config.channelId);
                if (!channel) return;

                if (config.type === 'simple') {
                    if (!config.message) return;

                    const message = replacePlaceholders(config.message, member);
                    const { sendWithEmbedTag } = require('../services/embedSend');
                    const { ctxFromMember } = require('../services/embedVars');
                    const { sendWithContainerTag } = require('../services/containerSend');
                    if (await sendWithContainerTag(channel, message, ctxFromMember(member, channel))) return;
                    if (await sendWithEmbedTag(channel, message, ctxFromMember(member, channel))) return;
                    await channel.send({ content: message });
                } else {
                    const container = new ContainerBuilder();

                    if (config.color) {
                        container.setAccentColor(config.color);
                    }

                    const title = replacePlaceholders(config.title || 'Welcome', member);
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${title}`)
                    );

                    container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );

                    const description = replacePlaceholders(config.description || `Welcome to ${member.guild.name}!`, member);
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

                    await channel.send({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            } catch (error) {
                console.error('Welcome event error:', error);
            }
        });
    }
};
