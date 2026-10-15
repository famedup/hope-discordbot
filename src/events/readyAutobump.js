// [dev] cashholy (carti) :: events/readyAutobump.js

const { Events } = require('discord.js');
const autobumpDb = require('../database/autobump');
const { startBumpTimer } = require('../modules/dual/autobump/subcommands/enable');

module.exports = {
    name: Events.ClientReady,
    once: true, 
    async execute(client) {
        try {
            
            const configs = await autobumpDb.getAllEnabled();

            let restored = 0;
            for (const config of configs) {
                
                const guild = client.guilds.cache.get(config.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) continue;

                
                startBumpTimer(client, config.guildId, config);
                restored++;
            }

        } catch (error) {
            console.error('[Autobump] Error restoring timers:', error);
        }
    }
};
