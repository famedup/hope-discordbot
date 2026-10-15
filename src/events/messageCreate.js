/**
 * @file messageCreate.js
 * @developer cashholy (carti)
 */

const {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorSpacingSize,
  MessageType,
} = require("discord.js");
const { AFK, NoPrefix, GuildPrefix, Blacklist, AutoReact, GuildConfig, BotCustomization } = require('../database/schemas');
const emojis = require('../media/emojis.json');
const { getMediaChannel, getBypass } = require('../database/mediaDb');

const { isAiChannel } = require('../database/aiChannel');
const { filterMentions } = require('../services/mentionFilter');
const { generateAiResponse, CASUAL_PROMPT, hasApiKey, splitMessage } = require('../services/aiUtils');
const { isAdminLockEnabled } = require('../services/adminLock');
const commandLockDb = require('../database/commandLock');
const config = require('../settings');
const botLogger = require('../services/botLogger');
const { checkCooldown, storePendingReply, clearPendingReply } = require('../services/cooldown');

const aiCooldowns = new Map();
const AI_COOLDOWN_MS = 5000;

const noPrefixCache = new Map();
const aiChannelCache = new Map();
const mediaChannelCache = new Map();
const guildConfigCache = new Map();
const autoReactCache = new Map();
const afkTools = require('../services/afkTools');
const { afkMentionCache, afkAuthorCache } = afkTools;
const blacklistUserCache = new Map();
const blacklistGuildCache = new Map();
const CACHE_TTL = 30000;

function getCached(cache, key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.val;
  return undefined;
}
function setCache(cache, key, val) {
  cache.set(key, { val, ts: Date.now() });
}

setInterval(() => {
  const now = Date.now();
  for (const cache of [noPrefixCache, aiChannelCache, mediaChannelCache, guildConfigCache, autoReactCache, afkMentionCache, afkAuthorCache, blacklistUserCache, blacklistGuildCache]) {
    for (const [k, v] of cache) {
      if (now - v.ts >= CACHE_TTL) cache.delete(k);
    }
  }
}, 60000);

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}`);

  return parts.join(', ') || '0 seconds';
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) {
      botLogger.logDM(message);
      return;
    }

    if (client.dokdo) await client.dokdo.run(message);

    try {
      let guildConfig = getCached(guildConfigCache, message.guildId);
      if (guildConfig === undefined) {
        guildConfig = await GuildConfig.findOne({ where: { guildId: message.guildId }, raw: true });
        setCache(guildConfigCache, message.guildId, guildConfig);
      }
      const isEnabled = guildConfig ? guildConfig.autoreactEnabled : true;

      if (isEnabled) {
        let reactions = getCached(autoReactCache, message.guildId);
        if (reactions === undefined) {
          reactions = await AutoReact.findAll({ where: { guildId: message.guildId } });
          setCache(autoReactCache, message.guildId, reactions);
        }
        const lowerContent = message.content.toLowerCase();
        const matchingEmojis = reactions
          .filter(r => lowerContent.includes(r.trigger.toLowerCase()))
          .map(r => {
            const customEmojiMatch = r.emoji.match(/<a?:.+:(\d+)>/);
            return customEmojiMatch ? customEmojiMatch[1] : r.emoji;
          });

        if (matchingEmojis.length > 0) {
          await Promise.all(
            matchingEmojis.map(emoji =>
              message.react(emoji).catch(err => {
                console.error(`[AUTOREACT] Failed to react with ${emoji}:`, err.message);
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('[AUTOREACT] Error processing reactions:', error.message);
    }

    const globalPrefix = config.PREFIX;

    const cachedNoPrefix = getCached(noPrefixCache, message.author.id);
    const [serverPrefix, noPrefixFetched] = await Promise.all([
      GuildPrefix.getPrefix(message.guildId),
      cachedNoPrefix === undefined
        ? NoPrefix.isNoPrefixUser(message.author.id)
        : Promise.resolve(cachedNoPrefix)
    ]);

    let hasNoPrefix;
    if (cachedNoPrefix !== undefined) {
      hasNoPrefix = cachedNoPrefix;
    } else {
      hasNoPrefix = noPrefixFetched;
      setCache(noPrefixCache, message.author.id, hasNoPrefix);
    }

    let messageContent;
    let isMediaCommand = false;

    const mentionPrefix = `<@${client.user.id}>`;
    const mentionPrefixAlt = `<@!${client.user.id}>`;
    const startsWithMention =
      message.content.startsWith(mentionPrefix) ||
      message.content.startsWith(mentionPrefixAlt);

    let usedPrefixStr = '';
    if (serverPrefix && message.content.startsWith(serverPrefix)) {
      messageContent = message.content.slice(serverPrefix.length).trim();
      usedPrefixStr = serverPrefix;
    } else if (!serverPrefix && message.content.startsWith(globalPrefix)) {
      messageContent = message.content.slice(globalPrefix.length).trim();
      usedPrefixStr = globalPrefix;
    } else if (startsWithMention) {
      const usedMention = message.content.startsWith(mentionPrefixAlt) ? mentionPrefixAlt : mentionPrefix;
      messageContent = message.content.slice(usedMention.length).trim();
      usedPrefixStr = `@${client.user.username} `;
    } else if (hasNoPrefix) {
      messageContent = message.content.trim();
      usedPrefixStr = '';
    } else {
      messageContent = null;
    }

    // Resolve the command once — result is reused for media-channel check and dispatch
    let resolvedCmd = null;
    if (messageContent && client.prefixCommands) {
      const allWords = messageContent.split(/ +/);
      const usedPrefixFlag = (serverPrefix ? message.content.startsWith(serverPrefix) : message.content.startsWith(globalPrefix)) ||
        startsWithMention;

      for (let wordCount = Math.min(allWords.length, 3); wordCount > 0; wordCount--) {
        const potentialCommand = allWords.slice(0, wordCount).join(' ').toLowerCase();
        if (client.prefixCommands.has(potentialCommand)) {
          const command = client.prefixCommands.get(potentialCommand);
          const args = allWords.slice(wordCount);

          if (!usedPrefixFlag && potentialCommand.length <= 2 && command.name !== 'ai') {
            const restOfMessage = allWords.slice(wordCount).join(' ').toLowerCase();
            if (restOfMessage.length > 0) {
              const looksLikeArgs = /^(<@!?\d+>|\d{17,19}|--?\w+|@\w+)/.test(restOfMessage) ||
                args.length === 0;
              if (!looksLikeArgs) {
                continue;
              }
            }
          }

          resolvedCmd = { command, args, potentialCommand, usedPrefixFlag };
          break;
        }
      }
    }

    if (resolvedCmd?.command?.allowMediaChannel === true) {
      isMediaCommand = true;
    }

    if (!isMediaCommand) {
      let mediaChannelData = getCached(mediaChannelCache, message.guild.id);
      if (mediaChannelData === undefined) {
        mediaChannelData = await getMediaChannel(message.guild.id);
        setCache(mediaChannelCache, message.guild.id, mediaChannelData);
      }
      if (mediaChannelData && message.channel.id === mediaChannelData.channel_id) {
        const isBypassed = await getBypass(message.guild.id, message.author.id);

        if (!isBypassed) {
          
          const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;

          if (!hasMedia) {
            try {
              await message.delete();

              const warningContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `${message.author} This channel is configured for Media only. Please send only media files.`
                  )
                );

              const warningMsg = await message.channel.send({
                components: [warningContainer],
                flags: MessageFlags.IsComponentsV2
              });
              setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
            } catch (error) {
              console.error('Error enforcing media channel:', error);
            }
            return;
          }
        }
      }
    }

    const aiCacheKey = `${message.guild.id}:${message.channel.id}`;
    let inAiChannel = getCached(aiChannelCache, aiCacheKey);
    if (inAiChannel === undefined) {
      inAiChannel = await isAiChannel(message.guild.id, message.channel.id);
      setCache(aiChannelCache, aiCacheKey, inAiChannel);
    }

    if (resolvedCmd && messageContent) {
      const firstWord = messageContent.split(/ +/)[0].toLowerCase();
      const isAiCommand = firstWord === 'ai';
      const { command, args, potentialCommand, usedPrefixFlag } = resolvedCmd;

      if (!(inAiChannel && !usedPrefixFlag && !isAiCommand && !hasNoPrefix)) {
        try {
          try {
            let userBlacklisted = getCached(blacklistUserCache, message.author.id);
            let guildBlacklisted = getCached(blacklistGuildCache, message.guildId);
            if (userBlacklisted === undefined || guildBlacklisted === undefined) {
              const fetches = await Promise.all([
                userBlacklisted === undefined
                  ? Blacklist.model.findOne({ where: { type: 'user', entityId: message.author.id } })
                  : Promise.resolve(userBlacklisted),
                guildBlacklisted === undefined
                  ? Blacklist.model.findOne({ where: { type: 'guild', entityId: message.guildId } })
                  : Promise.resolve(guildBlacklisted)
              ]);
              if (userBlacklisted === undefined) {
                userBlacklisted = fetches[0];
                setCache(blacklistUserCache, message.author.id, userBlacklisted);
              }
              if (guildBlacklisted === undefined) {
                guildBlacklisted = fetches[1];
                setCache(blacklistGuildCache, message.guildId, guildBlacklisted);
              }
            }

            if (userBlacklisted) {
              const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('### Blacklisted')
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('You have been restricted from using this bot.')
                );
              return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (guildBlacklisted) {
              const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('### Server Blacklisted')
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('This server has been restricted from using this bot.')
                );
              return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
          } catch (err) {
            console.error('[BLACKLIST] Error:', err.message);
          }

          if (command.ownerOnly && message.author.id !== config.OWNER_ID) {
            return message.reply('❌ Owner only');
          }

          if (isAdminLockEnabled() && message.author.id !== config.OWNER_ID) {
            const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Admin Lock Active')
              )
              .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Commands are currently locked by the owner.`)
              );

            return message.reply({
              components: [lockContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }

          const cmdToLockCheck = command.name.toLowerCase();
          const potentialCommandLower = potentialCommand.toLowerCase();
          let isLocked;
          if (cmdToLockCheck === potentialCommandLower) {
            isLocked = await commandLockDb.isLocked(cmdToLockCheck);
          } else {
            const [lock1, lock2] = await Promise.all([
              commandLockDb.isLocked(cmdToLockCheck),
              commandLockDb.isLocked(potentialCommandLower)
            ]);
            isLocked = lock1 || lock2;
          }

          if (isLocked && message.author.id !== config.OWNER_ID) {
            const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Command Locked')
              )
              .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`The command **${command.name}** is currently locked by the owner.`)
              );

            return message.reply({
              components: [lockContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }

          if (message.author.id !== config.OWNER_ID) {
            const { onCooldown, remaining } = checkCooldown(message.author.id, command.name);
            if (onCooldown) {
              const cooldownContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`**Command Cooldown**`)
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`**Oi Stop!** You're doing it too fast. ${emojis.angry}\n-# Try again later in **${remaining}s**`)
                );
              const cooldownMsg = await message.reply({ components: [cooldownContainer], flags: MessageFlags.IsComponentsV2 });
              const timeoutId = setTimeout(async () => {
                try { await cooldownMsg.delete(); } catch (_) {}
                clearPendingReply(message.author.id);
              }, parseFloat(remaining) * 1000);
              storePendingReply(message.author.id, timeoutId, async () => {
                try { await cooldownMsg.delete(); } catch (_) {}
              });
              return;
            }
          }

          try {
            message.invokedAs = potentialCommand;
            message.usedPrefix = usedPrefixStr;
            await command.execute(message, args);
            botLogger.logPrefixCommand(message, command.name, usedPrefixStr);
          } catch (error) {
            console.error('Command execution error:', error);
            botLogger.logError(error, `Prefix command: ${usedPrefixStr}${command.name}`, message.client).catch(() => {});
            return message.reply('❌ Something went wrong while running this command.');
          }
          return;
        } catch (error) {
          console.error('Command parsing error:', error);
        }
      }
    }

    if (inAiChannel) {
      if (!hasApiKey()) {
        return;
      }

      const userMessage = message.content.trim();
      if (!userMessage) return;

      const now = Date.now();
      const lastUsed = aiCooldowns.get(message.author.id) || 0;
      if (now - lastUsed < AI_COOLDOWN_MS) {
        const remaining = Math.ceil((AI_COOLDOWN_MS - (now - lastUsed)) / 1000);
        return message.reply(`Please wait ${remaining}s before sending another AI message.`).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      }
      aiCooldowns.set(message.author.id, now);

      try {
        await message.channel.sendTyping();

        const result = await generateAiResponse({
          userId: message.author.id,
          channelId: message.channelId,
          guildId: message.guildId,
          prompt: userMessage,
          systemPrompt: CASUAL_PROMPT,
          includeHistory: true,
          saveToHistory: true,
          model: 'openai/gpt-oss-120b',
          maxTokens: 2048
        });

        if (result.success) {
          const chunks = result.chunks || splitMessage(result.content);

          for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
              await message.reply(chunks[i]);
            } else {
              await message.channel.send(chunks[i]);
            }
          }
        }
      } catch (error) {
        console.error('[AI CHANNEL] Error:', error.message);
      }
      return;
    }

    const afkAuthorKey = `${message.guildId}:${message.author.id}`;
    let userAFK = getCached(afkAuthorCache, afkAuthorKey);
    if (userAFK === undefined) {
      const foundAFK = await AFK.findOne({ where: { guildId: message.guildId, userId: message.author.id } });
      if (foundAFK) {
        await foundAFK.destroy();
        userAFK = foundAFK;
      } else {
        userAFK = null;
        setCache(afkAuthorCache, afkAuthorKey, null);
      }
    }

    if (userAFK) {
      afkMentionCache.delete(afkAuthorKey);
      afkAuthorCache.delete(afkAuthorKey);

      await message.reply(afkTools.body(afkTools.welcomeBack(message.author.id))).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), afkTools.NOTICE_TTL);
      }).catch(err => {
        console.error('[MESSAGE_CREATE] Failed to send AFK notification:', err.message);
      });
    }

    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        if (user.bot) continue;
        if (userId === message.author.id) continue;

        const afkCacheKey = `${message.guildId}:${userId}`;
        let mentionedAFK = getCached(afkMentionCache, afkCacheKey);
        if (mentionedAFK === undefined) {
          mentionedAFK = await AFK.findOne({
            where: {
              guildId: message.guildId,
              userId: userId
            }
          });
          setCache(afkMentionCache, afkCacheKey, mentionedAFK);
        }

        if (mentionedAFK) {
          await message.reply(afkTools.body(afkTools.line(
            `**${user.username}** is AFK: ${mentionedAFK.reason} · <t:${Math.round(mentionedAFK.time / 1000)}:R>`,
          ))).catch(() => {});

          if (mentionedAFK.dm) {
            try {
              const dmContainer = new ContainerBuilder().setAccentColor(0x57F287)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`${emojis.success} **Mentioned While AFK**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`- **From:** ${message.author.username}\n- **Server:** ${message.guild.name}\n- **Channel:** [${message.channel.name}](${message.url})`)
                );

              await user.send({
                components: [dmContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
              });
            } catch (error) {
              console.log(`Could not send DM to ${user.username}`);
            }
          }
          break;
        }
      }
    }

    if (message.mentions.users.has(client.user.id) && message.type !== MessageType.Reply && message.content.trim() === `<@${client.user.id}>` &&
        (!message.guildId || (await BotCustomization.read(message.guildId)).mentionReply !== false)) {
      let prefixForDisplay = serverPrefix;
      if (!prefixForDisplay) {
        prefixForDisplay = config.PREFIX;
      }
      const prefix = prefixForDisplay;
      // no accent colour on purpose: no sidebar, just the plain container
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`<:hdot:1558403719463444590> My prefix in this server is \`${prefix}\``)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false },
      });
    }
  },
};
