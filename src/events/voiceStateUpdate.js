/* ⌁ crafted by cashholy (carti) ⌁ */

const { Events } = require('discord.js');
const { J2CConfig, TempChannel } = require('../database/schemas');

const j2cConfigCache = new Map();
const J2C_CACHE_TTL = 60000;

async function getJ2CConfig(guildId) {
    const cached = j2cConfigCache.get(guildId);
    if (cached && Date.now() - cached.ts < J2C_CACHE_TTL) return cached.val;
    const config = await J2CConfig.findOne({ where: { guildId }, raw: true });
    j2cConfigCache.set(guildId, { val: config, ts: Date.now() });
    return config;
}

module.exports = {
    name: Events.VoiceStateUpdate,
    /** Drop the cached config so setup/reset take effect immediately instead of after up to 60s. */
    invalidate: (guildId) => j2cConfigCache.delete(guildId),
    async execute(oldState, newState) {
        const client = newState.client || oldState.client;
        const guild = newState.guild;
        const member = newState.member;

        if (!member.user.bot) {
            const guildId = guild.id;
            const config = await getJ2CConfig(guildId);

            if (config) {
                if (newState.channel && newState.channel.id === config.voiceChannelId) {
                    const category = guild.channels.cache.get(config.categoryId);
                    if (category) {
                        try {
                            const newVC = await guild.channels.create({
                                name: `${member.displayName}'s VC`,
                                type: 2,
                                parent: category.id,
                                reason: 'Join to Create'
                            });

                            await TempChannel.create({
                                channelId: newVC.id,
                                guildId: guildId,
                                ownerId: member.id
                            });

                            await member.voice.setChannel(newVC);
                        } catch (error) {
                            console.error('Error creating temp VC:', error);
                        }
                    }
                }

                if (oldState.channel) {
                    const tempChannel = await TempChannel.findOne({
                        where: {
                            guildId: guildId,
                            channelId: oldState.channel.id
                        },
                        raw: true
                    });

                    if (tempChannel && oldState.channel.members.size === 0) {
                        try {
                            const channel = guild.channels.cache.get(oldState.channel.id);
                            if (channel && channel.members.size === 0) {
                                await channel.delete('Temporary VC is empty');
                                await TempChannel.destroy({
                                    where: { channelId: oldState.channel.id }
                                });
                            }
                        } catch (error) {
                            console.error('Error deleting temp VC:', error);
                        }
                    }
                }
            }
        }
    },
};
