/*
 * Developed by cashholy (carti)
 * File: services/dumpExporter.js
 */

const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

class DumpExporter {
  static async createDumpFile(filename, content) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const sanitizedFilename = `dump-${filename}-${timestamp}.txt`;
    const tempPath = path.join(__dirname, '..', 'temp', sanitizedFilename);
    
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const header = this.createHeader(filename);
    const fullContent = `${header}\n\n${content}`;
    
    fs.writeFileSync(tempPath, fullContent, 'utf-8');
    
    return { path: tempPath, filename: sanitizedFilename };
  }

  static createHeader(title) {
    const timestamp = new Date().toLocaleString();
    return `${'='.repeat(60)}\n${title.toUpperCase()}\nGenerated: ${timestamp}\n${'='.repeat(60)}`;
  }

  static formatRoles(guild) {
    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(role => {
        const members = role.members.size;
        const permissions = role.permissions.toArray().join(', ') || 'None';
        const color = role.hexColor;
        
        return `\n[Role: ${role.name}]\n` +
               `  ID: ${role.id}\n` +
               `  Position: ${role.position}\n` +
               `  Color: ${color}\n` +
               `  Members: ${members}\n` +
               `  Mentionable: ${role.mentionable ? 'Yes' : 'No'}\n` +
               `  Hoisted: ${role.hoist ? 'Yes' : 'No'}\n` +
               `  Managed: ${role.managed ? 'Yes' : 'No'}\n` +
               `  Permissions: ${permissions}`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total Roles: ${guild.roles.cache.size}\n${roles}`;
  }

  static formatChannels(guild, type = 'GUILD_TEXT') {
    const channels = guild.channels.cache
      .filter(ch => ch.type === 0)
      .sort((a, b) => a.position - b.position)
      .map(channel => {
        return `\n[Channel: #${channel.name}]\n` +
               `  ID: ${channel.id}\n` +
               `  Category: ${channel.parent?.name || 'None'}\n` +
               `  Position: ${channel.position}\n` +
               `  Topic: ${channel.topic || 'No topic set'}\n` +
               `  NSFW: ${channel.nsfw ? 'Yes' : 'No'}\n` +
               `  Slowmode: ${channel.rateLimitPerUser || 0} seconds`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total Text Channels: ${guild.channels.cache.filter(ch => ch.type === 0).size}\n${channels}`;
  }

  static formatVoiceChannels(guild) {
    const channels = guild.channels.cache
      .filter(ch => ch.type === 2)
      .sort((a, b) => a.position - b.position)
      .map(channel => {
        return `\n[Voice Channel: ${channel.name}]\n` +
               `  ID: ${channel.id}\n` +
               `  Category: ${channel.parent?.name || 'None'}\n` +
               `  Position: ${channel.position}\n` +
               `  Bitrate: ${channel.bitrate / 1000}kbps\n` +
               `  User Limit: ${channel.userLimit || 'Unlimited'}\n` +
               `  RTC Region: ${channel.rtcRegion || 'Automatic'}`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total Voice Channels: ${guild.channels.cache.filter(ch => ch.type === 2).size}\n${channels}`;
  }

  static formatCategories(guild) {
    const categories = guild.channels.cache
      .filter(ch => ch.type === 4)
      .sort((a, b) => a.position - b.position)
      .map(category => {
        const children = guild.channels.cache.filter(ch => ch.parentId === category.id);
        const textChannels = children.filter(ch => ch.type === 0).size;
        const voiceChannels = children.filter(ch => ch.type === 2).size;
        
        return `\n[Category: ${category.name}]\n` +
               `  ID: ${category.id}\n` +
               `  Position: ${category.position}\n` +
               `  Text Channels: ${textChannels}\n` +
               `  Voice Channels: ${voiceChannels}\n` +
               `  Total Channels: ${children.size}`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total Categories: ${guild.channels.cache.filter(ch => ch.type === 4).size}\n${categories}`;
  }

  static formatEmojis(guild) {
    const emojis = guild.emojis.cache
      .map(emoji => {
        return `\n[Emoji: ${emoji.name}]\n` +
               `  ID: ${emoji.id}\n` +
               `  Animated: ${emoji.animated ? 'Yes' : 'No'}\n` +
               `  Available: ${emoji.available ? 'Yes' : 'No'}\n` +
               `  Managed: ${emoji.managed ? 'Yes' : 'No'}\n` +
               `  URL: ${emoji.url}`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total Emojis: ${guild.emojis.cache.size}\n${emojis}`;
  }

  static formatMembers(guild, filterBots = false, botsOnly = false) {
    let members = guild.members.cache;
    
    if (filterBots) {
      members = members.filter(m => !m.user.bot);
    } else if (botsOnly) {
      members = members.filter(m => m.user.bot);
    }
    
    const formatted = members
      .map(member => {
        const roles = member.roles.cache
          .filter(r => r.id !== guild.id)
          .map(r => r.name)
          .join(', ') || 'None';
        
        return `\n[${member.user.bot ? 'Bot' : 'User'}: ${member.user.tag}]\n` +
               `  ID: ${member.user.id}\n` +
               `  Nickname: ${member.nickname || 'None'}\n` +
               `  Joined Server: ${member.joinedAt ? member.joinedAt.toLocaleString() : 'Unknown'}\n` +
               `  Account Created: ${member.user.createdAt.toLocaleString()}\n` +
               `  Roles: ${roles}\n` +
               `  Highest Role: ${member.roles.highest.name}`;
      })
      .join('\n' + '-'.repeat(60));
    
    return `Total ${filterBots ? 'Humans' : botsOnly ? 'Bots' : 'Members'}: ${members.size}\n${formatted}`;
  }

  static async formatMessages(channel, limit = 100) {
    try {
      const messages = await channel.messages.fetch({ limit });
      
      const formatted = messages
        .reverse()
        .map(msg => {
          const attachments = msg.attachments.size > 0 
            ? `\n  Attachments: ${msg.attachments.map(a => a.url).join(', ')}` 
            : '';
          
          return `\n[${msg.author.tag}] - ${msg.createdAt.toLocaleString()}\n` +
                 `  ID: ${msg.id}\n` +
                 `  Content: ${msg.content || '(No text content)'}${attachments}`;
        })
        .join('\n' + '-'.repeat(60));
      
      return `Channel: #${channel.name}\nTotal Messages Fetched: ${messages.size}\n${formatted}`;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
  }

  static async formatBans(guild) {
    try {
      const bans = await guild.bans.fetch();
      
      const formatted = bans
        .map(ban => {
          return `\n[Banned User: ${ban.user.tag}]\n` +
                 `  ID: ${ban.user.id}\n` +
                 `  Reason: ${ban.reason || 'No reason provided'}`;
        })
        .join('\n' + '-'.repeat(60));
      
      return `Total Bans: ${bans.size}\n${formatted}`;
    } catch (error) {
      throw new Error(`Failed to fetch bans: ${error.message}`);
    }
  }

  static formatSettings(guild) {
    return `Server Name: ${guild.name}\n` +
           `Server ID: ${guild.id}\n` +
           `Owner: ${guild.ownerId}\n` +
           `Created: ${guild.createdAt.toLocaleString()}\n` +
           `Member Count: ${guild.memberCount}\n` +
           `Boost Level: ${guild.premiumTier}\n` +
           `Boost Count: ${guild.premiumSubscriptionCount || 0}\n` +
           `Verification Level: ${guild.verificationLevel}\n` +
           `Explicit Content Filter: ${guild.explicitContentFilter}\n` +
           `Default Notifications: ${guild.defaultMessageNotifications}\n` +
           `MFA Level: ${guild.mfaLevel}\n` +
           `AFK Channel: ${guild.afkChannel?.name || 'None'}\n` +
           `AFK Timeout: ${guild.afkTimeout} seconds\n` +
           `System Channel: ${guild.systemChannel?.name || 'None'}\n` +
           `Rules Channel: ${guild.rulesChannel?.name || 'None'}\n` +
           `Description: ${guild.description || 'None'}\n` +
           `Preferred Locale: ${guild.preferredLocale}\n` +
           `Features: ${guild.features.join(', ') || 'None'}`;
  }

  static async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = DumpExporter;
