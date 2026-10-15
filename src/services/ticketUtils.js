// @cashholy(carti) — ticketUtils

const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, MessageFlags, AttachmentBuilder, FileBuilder,
    ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const ui = require('./ui');

async function logTicketEvent(guild, config, eventTitle, eventDescription) {
    try {
        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (!logChannel) return;

        const embed = ui.embed({
            title: eventTitle,
            description: eventDescription,
            timestamp: true,
        });

        await logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
        console.error('Ticket logging error:', error);
    }
}

function escapeHtml(text) {
    return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDiscordMarkdown(text) {
    let s = escapeHtml(text);
    s = s.replace(/```([^`]*?)```/gs, '<pre class="code-block">$1</pre>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/__(.+?)__/g, '<u>$1</u>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    s = s.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
    s = s.replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>');
    s = s.replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>');
    s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    s = s.replace(/-# (.+)/g, '<span class="subtext">$1</span>');
    s = s.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
    s = s.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention role">@role</span>');
    s = s.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#channel</span>');
    s = s.replace(/&lt;t:(\d+)(?::([tTdDfFR]))?\&gt;/g, (_, ts) => {
        const d = new Date(parseInt(ts) * 1000);
        return `<span class="timestamp-inline">${d.toLocaleString()}</span>`;
    });
    s = s.replace(/\n/g, '<br>');
    return s;
}

function renderEmbed(embed) {
    const color = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865f2';
    let h = `<div class="embed" style="border-left-color: ${color};">`;
    if (embed.author) h += `<div class="embed-author">${escapeHtml(embed.author.name || '')}</div>`;
    if (embed.title) h += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
    if (embed.description) h += `<div class="embed-desc">${formatDiscordMarkdown(embed.description)}</div>`;
    if (embed.fields?.length) {
        h += '<div class="embed-fields">';
        for (const f of embed.fields) {
            h += `<div class="embed-field${f.inline ? ' inline' : ''}"><div class="embed-field-name">${escapeHtml(f.name)}</div><div class="embed-field-value">${formatDiscordMarkdown(f.value)}</div></div>`;
        }
        h += '</div>';
    }
    if (embed.image) h += `<div class="embed-image"><img src="${escapeHtml(embed.image.url)}" alt="embed image"></div>`;
    if (embed.thumbnail) h += `<div class="embed-thumb"><img src="${escapeHtml(embed.thumbnail.url)}" alt="thumbnail"></div>`;
    if (embed.footer) h += `<div class="embed-footer">${escapeHtml(embed.footer.text || '')}</div>`;
    h += '</div>';
    return h;
}

function renderEmoji(emoji) {
    if (!emoji) return '';
    if (emoji.id) {
        const ext = emoji.animated ? 'gif' : 'png';
        return `<img class="btn-emoji" src="https://cdn.discordapp.com/emojis/${emoji.id}.${ext}" alt="${escapeHtml(emoji.name || '')}" width="18" height="18">`;
    }
    if (emoji.name) return `<span class="btn-emoji-unicode">${emoji.name}</span>`;
    return '';
}

function renderActionRow(row) {
    const comps = row.components || [];
    if (comps.length === 0) return '';
    const first = comps[0];
    if ([3, 5, 6, 7, 8].includes(first.type)) {
        const placeholder = escapeHtml(first.placeholder || 'Select an option...');
        return `<div class="cv2-select"><span class="cv2-select-placeholder">${placeholder}</span><span class="cv2-select-arrow">&#9660;</span></div>`;
    }
    let h = '<div class="cv2-buttons">';
    for (const btn of comps) {
        const emojiHtml = renderEmoji(btn.emoji);
        const label = escapeHtml(btn.label || '');
        const isLink = btn.style === 5;
        const cls = btn.style === 4 ? 'btn-danger' : btn.style === 3 ? 'btn-success' : isLink ? 'btn-link' : 'btn-primary';
        if (isLink && btn.url) {
            h += `<a class="cv2-btn ${cls}" href="${escapeHtml(btn.url)}" target="_blank">${emojiHtml}${label}</a>`;
        } else {
            h += `<span class="cv2-btn ${cls}">${emojiHtml}${label}</span>`;
        }
    }
    h += '</div>';
    return h;
}

function renderComponents(components) {
    let h = '';
    for (const row of components) {
        const comps = row.components || [];
        if (comps.length === 0) continue;
        const first = comps[0];
        if (first.type === 10) {
            h += `<div class="cv2-text">${formatDiscordMarkdown(first.content || '')}</div>`;
        } else if (first.type === 14) {
            h += '<div class="cv2-separator"></div>';
        } else if (first.type === 1) {
            h += renderActionRow(first);
        } else if (first.type === 2) {
            const emojiHtml = renderEmoji(first.emoji);
            const label = escapeHtml(first.label || 'Button');
            const cls = first.style === 4 ? 'btn-danger' : first.style === 3 ? 'btn-success' : first.style === 5 ? 'btn-link' : 'btn-primary';
            h += `<div class="cv2-buttons"><span class="cv2-btn ${cls}">${emojiHtml}${label}</span></div>`;
        } else if (first.type === 9) {
            h += `<div class="cv2-section"><div class="cv2-section-text">${formatDiscordMarkdown(first.content || '')}</div></div>`;
        }
    }
    return h;
}

function renderContainerV2(msg) {
    let h = '';
    const rawComponents = msg.components || [];
    for (const topLevel of rawComponents) {
        if (topLevel.type === 17) {
            h += '<div class="cv2-container">';
            const inner = topLevel.components || [];
            for (const comp of inner) {
                if (comp.type === 10) {
                    h += `<div class="cv2-text">${formatDiscordMarkdown(comp.content || '')}</div>`;
                } else if (comp.type === 14) {
                    h += '<div class="cv2-separator"></div>';
                } else if (comp.type === 1) {
                    h += renderActionRow(comp);
                } else if (comp.type === 9) {
                    const sectionComps = comp.components || [];
                    h += '<div class="cv2-section">';
                    for (const sc of sectionComps) {
                        if (sc.type === 10) h += `<div class="cv2-text">${formatDiscordMarkdown(sc.content || '')}</div>`;
                    }
                    if (comp.accessory) {
                        if (comp.accessory.type === 11) h += `<img class="cv2-thumb" src="${escapeHtml(comp.accessory.media?.url || '')}" alt="">`;
                    }
                    h += '</div>';
                } else if (comp.type === 12) {
                    const items = comp.items || [];
                    if (items.length > 0) {
                        h += '<div class="cv2-gallery">';
                        for (const item of items) h += `<img src="${escapeHtml(item.media?.url || '')}" alt="" class="cv2-gallery-img">`;
                        h += '</div>';
                    }
                } else if (comp.type === 13) {
                    h += `<div class="cv2-file"><a href="${escapeHtml(comp.url || '#')}">${escapeHtml(comp.filename || 'File')}</a></div>`;
                }
            }
            h += '</div>';
        }
    }
    return h;
}

async function generateTranscript(ticket, guild, client) {
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel) throw new Error('Channel not found');

    let allMessages = [];
    let lastMessageId = null;

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;
        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;
        allMessages = allMessages.concat(Array.from(messages.values()));
        lastMessageId = messages.last().id;
    }

    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const creatorUser = guild.members.cache.get(ticket.userId);
    const guildIcon = guild.iconURL({ size: 64 }) || '';
    const messageCount = allMessages.length;
    const participants = [...new Set(allMessages.map(m => m.author.id))];

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Transcript — ${escapeHtml(channel.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI','-apple-system',BlinkMacSystemFont,sans-serif;background:#1e1f22;color:#dbdee1;line-height:1.5;min-height:100vh}
a{color:#00a8fc;text-decoration:none}a:hover{text-decoration:underline}
.wrapper{max-width:900px;margin:0 auto;padding:16px}
.header{background:#111214;border:1px solid #2b2d31;border-radius:8px;padding:24px;margin-bottom:16px;display:flex;gap:16px;align-items:center}
.header-icon{width:48px;height:48px;border-radius:50%;flex-shrink:0}
.header-info h1{font-size:18px;font-weight:600;color:#f2f3f5;margin-bottom:4px}
.header-info p{font-size:13px;color:#949ba4;margin:2px 0}
.header-info strong{color:#dbdee1}
.stats{display:flex;gap:16px;margin-top:8px;flex-wrap:wrap}
.stat{background:#2b2d31;padding:4px 10px;border-radius:4px;font-size:12px;color:#b5bac1}
.messages{display:flex;flex-direction:column}
.msg-group{padding:4px 16px 4px 72px;position:relative;margin-top:16px;min-height:52px}
.msg-group:hover{background:#2b2d3166}
.msg-avatar{position:absolute;left:16px;top:4px;width:40px;height:40px;border-radius:50%;object-fit:cover;background:#5865f2;flex-shrink:0}
.msg-header{display:flex;align-items:baseline;gap:8px}
.msg-author{font-weight:600;font-size:15px;color:#f2f3f5}
.msg-author.bot{color:#f2f3f5}
.bot-tag{background:#5865f2;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600;vertical-align:middle;margin-left:4px}
.msg-time{font-size:12px;color:#949ba4;font-weight:400}
.msg-content{font-size:15px;color:#dbdee1;word-wrap:break-word;margin-top:2px}
.msg-continuation{padding:2px 16px 2px 72px;position:relative}
.msg-continuation:hover{background:#2b2d3166}
.msg-continuation .msg-content{margin-top:0}
.mention{background:rgba(88,101,242,.15);color:#c9cdfb;padding:0 2px;border-radius:3px;font-weight:500}
.mention.role{background:rgba(88,101,242,.15)}
.timestamp-inline{background:rgba(88,101,242,.1);padding:0 2px;border-radius:3px;font-size:14px}
.subtext{font-size:12px;color:#949ba4}
h1{font-size:24px;font-weight:700;margin:8px 0}
h2{font-size:20px;font-weight:700;margin:6px 0}
h3{font-size:16px;font-weight:700;margin:4px 0}
blockquote{border-left:3px solid #4e5058;padding-left:10px;margin:4px 0;color:#b5bac1}
code{background:#2b2d31;padding:2px 5px;border-radius:3px;font-family:'Consolas',monospace;font-size:14px}
pre.code-block{background:#2b2d31;padding:10px;border-radius:4px;font-family:'Consolas',monospace;font-size:14px;overflow-x:auto;margin:4px 0;white-space:pre-wrap}
.embed{background:#2b2d31;border-left:4px solid #5865f2;border-radius:4px;padding:12px;margin:6px 0;max-width:520px}
.embed-author{font-size:13px;font-weight:600;color:#f2f3f5;margin-bottom:4px}
.embed-title{font-size:15px;font-weight:700;color:#00a8fc;margin-bottom:4px}
.embed-desc{font-size:14px;color:#dbdee1;margin-bottom:8px}
.embed-fields{display:flex;flex-wrap:wrap;gap:8px}
.embed-field{min-width:100%;margin-bottom:4px}
.embed-field.inline{min-width:0;flex:1;max-width:48%}
.embed-field-name{font-size:13px;font-weight:700;color:#f2f3f5;margin-bottom:2px}
.embed-field-value{font-size:14px;color:#dbdee1}
.embed-image{margin-top:8px}
.embed-image img{max-width:100%;border-radius:4px}
.embed-thumb{float:right;margin-left:12px}
.embed-thumb img{width:80px;height:80px;border-radius:4px;object-fit:cover}
.embed-footer{font-size:12px;color:#949ba4;margin-top:6px}
.attachment-grid{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.attachment-img{max-width:350px;max-height:300px;border-radius:4px;cursor:pointer}
.attachment-file{background:#2b2d31;border:1px solid #3f4147;border-radius:4px;padding:8px 12px;display:inline-flex;align-items:center;gap:8px;margin:4px 0}
.attachment-file svg{width:24px;height:24px;fill:#949ba4}
.cv2-container{background:#2b2d31;border-left:3px solid #fff;border-radius:4px;padding:12px;margin:6px 0;max-width:520px;width:fit-content;min-width:120px;overflow:hidden}
.cv2-text{font-size:14px;color:#dbdee1;margin:4px 0;word-break:break-word}
.cv2-separator{border-top:1px solid #3f4147;margin:8px 0}
.cv2-buttons{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;align-items:center}
.cv2-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:3px;font-size:13px;font-weight:500;color:#fff;text-decoration:none;cursor:default;line-height:1.2}
.btn-primary{background:#5865f2}
.btn-success{background:#248046}
.btn-danger{background:#da373c}
.btn-link{background:transparent;border:1px solid #4e5058;color:#00a8fc;cursor:pointer}
.btn-emoji{width:18px;height:18px;vertical-align:middle;flex-shrink:0}
.btn-emoji-unicode{font-size:16px;line-height:1;vertical-align:middle}
.cv2-section{display:flex;align-items:center;gap:12px;margin:4px 0;overflow:hidden}
.cv2-section-text{flex:1;min-width:0;word-break:break-word}
.cv2-thumb{width:64px;height:64px;flex-shrink:0;border-radius:4px;object-fit:cover}
.cv2-gallery{display:flex;gap:4px;margin:4px 0;flex-wrap:wrap;overflow:hidden}
.cv2-gallery-img{max-width:min(250px,100%);max-height:200px;border-radius:4px;display:block;object-fit:contain}
.cv2-select{background:#313338;border:1px solid #4e5058;border-radius:4px;padding:8px 12px;margin:6px 0;display:flex;align-items:center;justify-content:space-between;max-width:440px;width:100%}
.cv2-select-placeholder{color:#949ba4;font-size:14px}
.cv2-select-arrow{color:#949ba4;font-size:11px;margin-left:8px}
.cv2-file{margin:4px 0}
.cv2-file a{color:#00a8fc}
.footer{text-align:center;padding:20px;color:#949ba4;font-size:12px;border-top:1px solid #2b2d31;margin-top:16px}
</style></head><body>
<div class="wrapper">
<div class="header">`;
    if (guildIcon) html += `<img class="header-icon" src="${escapeHtml(guildIcon)}" alt="">`;
    html += `<div class="header-info">
<h1>${escapeHtml(channel.name)}</h1>
<p><strong>Server:</strong> ${escapeHtml(guild.name)}</p>
<p><strong>Category:</strong> ${escapeHtml(ticket.categoryName)}</p>
<p><strong>Creator:</strong> ${escapeHtml(creatorUser?.user?.tag || 'Unknown')}</p>
<p><strong>Created:</strong> ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown'}</p>
<div class="stats">
<span class="stat">${messageCount} messages</span>
<span class="stat">${participants.length} participants</span>
</div></div></div>
<div class="messages">`;

    let lastAuthorId = null;
    let lastTimestamp = 0;

    for (const message of allMessages) {
        const sameAuthor = message.author.id === lastAuthorId;
        const withinGroup = (message.createdTimestamp - lastTimestamp) < 420000;
        const isNewGroup = !sameAuthor || !withinGroup;

        const avatar = message.author.displayAvatarURL({ size: 64 });
        const isBot = message.author.bot;
        const dateStr = message.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

        const hasContainer = message.flags?.has(MessageFlags.IsComponentsV2) || (isBot && message.components?.length > 0 && message.components.some(c => c.type === 17));

        if (isNewGroup) {
            html += `<div class="msg-group">`;
            html += `<img class="msg-avatar" src="${escapeHtml(avatar)}" alt="">`;
            html += `<div class="msg-header"><span class="msg-author${isBot ? ' bot' : ''}">${escapeHtml(message.author.displayName || message.author.username)}${isBot ? '<span class="bot-tag">BOT</span>' : ''}</span><span class="msg-time">${dateStr}</span></div>`;
        } else {
            html += `<div class="msg-continuation">`;
        }

        if (message.content) {
            html += `<div class="msg-content">${formatDiscordMarkdown(message.content)}</div>`;
        }

        if (hasContainer) {
            html += renderContainerV2(message);
        }

        if (message.embeds?.length > 0 && !hasContainer) {
            for (const embed of message.embeds) html += renderEmbed(embed);
        }

        if (message.attachments?.size > 0) {
            html += '<div class="attachment-grid">';
            message.attachments.forEach(att => {
                const isImage = att.contentType?.startsWith('image/');
                if (isImage) {
                    html += `<img class="attachment-img" src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}">`;
                } else {
                    html += `<div class="attachment-file"><a href="${escapeHtml(att.url)}">${escapeHtml(att.name)}</a> <span class="subtext">(${(att.size / 1024).toFixed(1)} KB)</span></div>`;
                }
            });
            html += '</div>';
        }

        if (message.stickers?.size > 0) {
            message.stickers.forEach(sticker => {
                html += `<div class="msg-content"><em>[Sticker: ${escapeHtml(sticker.name)}]</em></div>`;
            });
        }

        html += '</div>';

        lastAuthorId = message.author.id;
        lastTimestamp = message.createdTimestamp;
    }

    html += `</div>
<div class="footer">Transcript generated for ${escapeHtml(guild.name)} — ${new Date().toLocaleString()}</div>
</div></body></html>`;

    const buffer = Buffer.from(html, 'utf-8');
    const filename = `ticket-${ticket.id}-${Date.now()}.html`;
    return new AttachmentBuilder(buffer, { name: filename });
}

async function generateAndSendTranscript(guild, config, ticket, client) {
    try {
        const transcript = await generateTranscript(ticket, guild, client);

        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (logChannel) {
            const filename = `ticket-${ticket.id}-${Date.now()}.html`;
            const creatorUser = await guild.members.fetch(ticket.userId).catch(() => null);
            const logEmbed = ui.embed({
                author: { name: creatorUser?.user?.tag || ticket.userId, iconURL: creatorUser?.user?.displayAvatarURL?.() },
                description: `<#${ticket.channelId}>\n**Category** ${ticket.categoryName}\n**Closed** <t:${Math.floor(Date.now() / 1000)}:F>`,
                footer: `Ticket ${ticket.id}`,
                timestamp: true,
            });

            await logChannel.send({
                embeds: [logEmbed],
                files: [{ attachment: transcript.attachment, name: filename }],
                allowedMentions: { parse: [] }
            });
        }

        const ticketCreator = guild.members.cache.get(ticket.userId);
        if (ticketCreator) {
            try {
                const dmFilename = `ticket-${ticket.id}-transcript.html`;
                const dmEmbed = ui.embed({
                    author: { name: guild.name, iconURL: guild.iconURL() || undefined },
                    description: `Ticket closed\n**Category** ${ticket.categoryName}`,
                    footer: `Ticket ${ticket.id}`,
                    timestamp: true,
                });

                await ticketCreator.send({
                    embeds: [dmEmbed],
                    files: [{ attachment: transcript.attachment, name: dmFilename }]
                }).catch(() => {});
            } catch {}
        }
    } catch (error) {
        console.error('Transcript generation error:', error);
    }
}

function getSupportRoleIds(config) {
    const roles = [config.supportRoleId];
    if (config.additionalRoleIds) {
        try {
            const additional = JSON.parse(config.additionalRoleIds);
            if (Array.isArray(additional)) roles.push(...additional);
        } catch {}
    }
    return [...new Set(roles)];
}

function hasSupportRole(member, config) {
    const roleIds = getSupportRoleIds(config);
    return roleIds.some(id => member.roles.cache.has(id));
}

async function refreshPanel(guild, config) {
    try {
        const panelChannel = guild.channels.cache.get(config.panelChannelId);
        if (!panelChannel) return;

        const { TicketCategory } = require('../database/schemas');
        const categories = await TicketCategory.findAll({ where: { guildId: guild.id }, order: [['id', 'ASC']] });
        if (categories.length === 0) return;

        const panelContainer = new ContainerBuilder();
        if (config.panelColor) panelContainer.setAccentColor(config.panelColor);

        const title = config.panelTitle || 'Support Tickets';
        const titleContent = `### ${title}${config.panelDescription ? '\n' + config.panelDescription : ''}`;
        const titleSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleContent));
        const serverIcon = guild.iconURL({ dynamic: true, size: 256 });
        if (!config.panelThumbnail && serverIcon) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIcon));
        else if (config.panelThumbnail) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(config.panelThumbnail));
        panelContainer.addSectionComponents(titleSection);

        panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        if (config.panelImage) {
            try {
                panelContainer.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.panelImage).setDescription('Support System'))
                );
                panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
            } catch {}
        }

        const options = categories.map(cat => {
            const opt = new StringSelectMenuOptionBuilder()
                .setLabel(cat.categoryName.substring(0, 25))
                .setValue(cat.categoryName);
            if (cat.description) opt.setDescription(cat.description.substring(0, 50));
            if (cat.emoji) { try { opt.setEmoji(cat.emoji); } catch {} }
            return opt;
        });

        panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('create_ticket').setPlaceholder('Select a category').setMaxValues(1).addOptions(options)
        ));

        if (config.panelMessageId) {
            try {
                const oldMsg = await panelChannel.messages.fetch(config.panelMessageId);
                if (oldMsg) await oldMsg.delete();
            } catch {}
        }

        const newMsg = await panelChannel.send({ components: [panelContainer], flags: MessageFlags.IsComponentsV2 });
        config.panelMessageId = newMsg.id;
        await config.save();
    } catch (error) {
        console.error('Panel refresh error:', error);
    }
}

module.exports = { logTicketEvent, generateTranscript, generateAndSendTranscript, getSupportRoleIds, hasSupportRole, refreshPanel };
