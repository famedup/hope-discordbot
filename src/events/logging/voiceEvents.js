/*
 * Developed by cashholy (carti)
 * File: events/logging/voiceEvents.js
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require('discord.js');
const { getLogChannel } = require('./loggingUtils');

module.exports = {
    name: 'voiceEvents',

    async init(client) {
        client.on('voiceStateUpdate', async (oldState, newState) => {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const member = newState.member || oldState.member;
            if (!member) return;

            
            if (!oldState.channelId && newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Voice Joined')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**User:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Channel:** <#${newState.channelId}>\n` +
                                    `**Server:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
            
            else if (oldState.channelId && !newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Voice Left')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**User:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Channel:** <#${oldState.channelId}>\n` +
                                    `**Server:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
            
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Voice Switched')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**User:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**From:** <#${oldState.channelId}>\n` +
                                    `**To:** <#${newState.channelId}>\n` +
                                    `**Server:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }

            
            if (oldState.channelId === newState.channelId && oldState.channelId) {
                const changes = [];

                if (oldState.selfMute !== newState.selfMute) {
                    changes.push(`**Self Mute:** ${oldState.selfMute ? 'Yes' : 'No'} → ${newState.selfMute ? 'Yes' : 'No'}`);
                }
                if (oldState.selfDeaf !== newState.selfDeaf) {
                    changes.push(`**Self Deaf:** ${oldState.selfDeaf ? 'Yes' : 'No'} → ${newState.selfDeaf ? 'Yes' : 'No'}`);
                }
                if (oldState.serverMute !== newState.serverMute) {
                    changes.push(`**Server Mute:** ${oldState.serverMute ? 'Yes' : 'No'} → ${newState.serverMute ? 'Yes' : 'No'}`);
                }
                if (oldState.serverDeaf !== newState.serverDeaf) {
                    changes.push(`**Server Deaf:** ${oldState.serverDeaf ? 'Yes' : 'No'} → ${newState.serverDeaf ? 'Yes' : 'No'}`);
                }
                if (oldState.streaming !== newState.streaming) {
                    changes.push(`**Streaming:** ${newState.streaming ? 'Started' : 'Stopped'}`);
                }
                if (oldState.selfVideo !== newState.selfVideo) {
                    changes.push(`**Camera:** ${newState.selfVideo ? 'Enabled' : 'Disabled'}`);
                }

                if (changes.length === 0) return;

                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Voice State Updated')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**User:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Channel:** <#${newState.channelId}>\n` +
                                    `${changes.join('\n')}\n` +
                                    `**Server:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
        });
    }
};
