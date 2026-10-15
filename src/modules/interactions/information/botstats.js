// [dev] cashholy (carti) :: modules/interactions/information/botstats.js

const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const os = require('os');
const fs = require('fs');

function getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
    }
    return (100 - (totalIdle / totalTick * 100)).toFixed(1);
}

function getDiskInfo() {
    try {
        const stat = fs.statfsSync('/');
        const free = ((stat.bfree * stat.bsize) / (1024 ** 3)).toFixed(1);
        const total = ((stat.blocks * stat.bsize) / (1024 ** 3)).toFixed(1);
        return { free, total };
    } catch {
        return { free: 'N/A', total: 'N/A' };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription("Shows the bot's system stats"),

    async execute(interaction) {
        const { client } = interaction;

        const servers = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const shards = client.ws.shards?.size || 1;
        const clusters = 1;
        const ramUsage = (process.memoryUsage().heapUsed / (1024 ** 2)).toFixed(1);
        const cpuUsage = getCPUUsage();
        const disk = getDiskInfo();

        const pad = (label, value, width = 14) => `- ${label.padEnd(width)}:: ${value}`;

        const botOverview = [
            '```asciidoc',
            pad('Servers', servers),
            pad('Users', users),
            pad('Shards', shards),
            pad('Clusters', clusters),
            pad('Ram Usage', `${ramUsage} MB`),
            pad('CPU Usage', `${cpuUsage}%`),
            pad('Disk', `${disk.free} GB Free`),
            '```'
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(botOverview)
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
