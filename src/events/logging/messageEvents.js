/* ⌁ crafted by cashholy (carti) ⌁ */

const {
    AttachmentBuilder,
    AuditLogEvent
} = require('discord.js');
const ui = require('../../services/ui');
const { LoggingConfig, GuildConfig } = require('../../database/schemas');
const fsPromises = require('fs').promises;
const path = require('path');

const loggingConfigCache = new Map();
const guildConfigCache = new Map();
const LOGGING_CACHE_TTL = 60000;

async function getLogChannel(client, guildId, type, legacyType = null) {
    try {
        const cachedGC = guildConfigCache.get(guildId);
        let guildConfig;
        if (cachedGC && Date.now() - cachedGC.ts < LOGGING_CACHE_TTL) {
            guildConfig = cachedGC.val;
        } else {
            guildConfig = await GuildConfig.findOne({ where: { guildId } });
            guildConfigCache.set(guildId, { val: guildConfig, ts: Date.now() });
        }
        if (!guildConfig || !guildConfig.loggingEnabled) return null;

        const cachedLC = loggingConfigCache.get(guildId);
        let config;
        if (cachedLC && Date.now() - cachedLC.ts < LOGGING_CACHE_TTL) {
            config = cachedLC.val;
        } else {
            config = await LoggingConfig.findOne({ where: { guildId } });
            loggingConfigCache.set(guildId, { val: config, ts: Date.now() });
        }
        if (!config) return null;

        
        let channelId = config[`${type}ChannelId`];
        if (!channelId && legacyType) {
            channelId = config[`${legacyType}EventsChannelId`];
        }
        if (!channelId) return null;

        return client.channels.cache.get(channelId);
    } catch (error) {
        return null;
    }
}

function truncateContent(content, maxLength = 1000) {
    if (!content) return 'No content';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
}

module.exports = {
    name: 'messageEvents',

    async init(client) {
        client.on('messageDelete', async (message) => {
            if (!message.guild) return;
            if (message.author?.bot) return;

            const logChannel = await getLogChannel(client, message.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const author = message.author;
            if (!author) return;

            const content = message.content || 'No text content';

            const lines = [
                `Message by <@${author.id}> deleted in <#${message.channelId}>`,
                `\`\`\`\n${truncateContent(content, 1500)}\n\`\`\``
            ];
            if (message.attachments.size > 0) {
                lines.push(message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'));
            }

            const embed = ui.embed({
                kind: 'error',
                author: { name: author.username, iconURL: author.displayAvatarURL({ dynamic: true, size: 256 }) },
                description: lines.join('\n'),
                footer: `ID: ${author.id} | #${message.channel?.name ?? message.channelId}`,
                timestamp: true
            });

            logChannel.send({ embeds: [embed], allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (!newMessage.guild) return;
            if (newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = await getLogChannel(client, newMessage.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const author = newMessage.author;
            if (!author) return;

            const oldContent = oldMessage.content || 'No content';
            const newContent = newMessage.content || 'No content';

            const embed = ui.embed({
                kind: 'warning',
                author: { name: author.username, iconURL: author.displayAvatarURL({ dynamic: true, size: 256 }) },
                description: `Message by <@${author.id}> edited in <#${newMessage.channelId}> [Jump](${newMessage.url})`,
                fields: [
                    { name: 'Before', value: `\`\`\`\n${truncateContent(oldContent, 700)}\n\`\`\`` },
                    { name: 'After', value: `\`\`\`\n${truncateContent(newContent, 700)}\n\`\`\`` }
                ],
                footer: `ID: ${author.id} | #${newMessage.channel?.name ?? newMessage.channelId}`,
                timestamp: true
            });

            logChannel.send({ embeds: [embed], allowedMentions: { users: [] } }).catch(err => {
                console.error('[LOGGING] Failed to send message edit log:', err.message);
            });
        });

        client.on('messageDeleteBulk', async (messages, channel) => {
            if (!channel.guild) return;

            const logChannel = await getLogChannel(client, channel.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const messageArray = Array.from(messages.values())
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            if (messageArray.length === 0) return;

            
            let moderator = null;
            try {
                const auditLogs = await channel.guild.fetchAuditLogs({ 
                    type: AuditLogEvent.MessageBulkDelete,
                    limit: 5 
                });
                
                const now = Date.now();
                const entry = auditLogs.entries.find(e => 
                    (now - e.createdTimestamp) < 5000 
                );
                
                if (entry && entry.executor) {
                    moderator = entry.executor;
                }
            } catch (err) {
                
            }

            let fileContent = `Bulk Delete Log - ${channel.guild.name}\n`;
            fileContent += `Channel: #${channel.name} (${channel.id})\n`;
            fileContent += `Time: ${new Date().toISOString()}\n`;
            fileContent += `Total Messages Deleted: ${messageArray.length}\n`;
            if (moderator) {
                fileContent += `Executor: ${moderator.tag} (${moderator.id})\n`;
            }
            fileContent += `${'='.repeat(50)}\n\n`;

            for (const msg of messageArray) {
                const author = msg.author ? `${msg.author.username} (${msg.author.id})` : 'Unknown';
                const timestamp = new Date(msg.createdTimestamp).toISOString();
                const content = msg.content || '[No text content]';
                const attachments = msg.attachments.size > 0
                    ? `\nAttachments: ${msg.attachments.map(a => a.url).join(', ')}`
                    : '';

                fileContent += `[${timestamp}] ${author}\n`;
                fileContent += `${content}${attachments}\n`;
                fileContent += `${'-'.repeat(40)}\n`;
            }

            const tmpDir = path.join(__dirname, '../../tmp');
            await fsPromises.mkdir(tmpDir, { recursive: true });

            const filename = `bulk_delete_${channel.guild.id}_${Date.now()}.txt`;
            const filePath = path.join(tmpDir, filename);

            await fsPromises.writeFile(filePath, fileContent);

            try {
                const attachment = new AttachmentBuilder(filePath, { name: filename });

                const embed = ui.embed({
                    kind: 'error',
                    author: moderator
                        ? { name: moderator.username, iconURL: moderator.displayAvatarURL({ dynamic: true, size: 256 }) }
                        : { name: channel.guild.name, iconURL: channel.guild.iconURL() ?? undefined },
                    description: `**${messageArray.length}** messages bulk deleted in <#${channel.id}>` +
                        (moderator ? ` by ${moderator.tag} (${moderator.id})` : ''),
                    footer: `ID: ${channel.id} | #${channel.name}`,
                    timestamp: true
                });

                await logChannel.send({
                    embeds: [embed],
                    files: [attachment],
                    allowedMentions: { users: [] }
                }).catch(err => {
                    console.error('[LOGGING] Failed to send bulk delete log:', err.message);
                });
            } finally {
                fsPromises.unlink(filePath).catch(err => {
                    console.error('[LOGGING] Failed to cleanup bulk delete log file:', err.message);
                });
            }
        });
    }
};
