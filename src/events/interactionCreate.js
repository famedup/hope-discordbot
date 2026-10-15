// ─── cashholy (carti) · developer ───

const { Events, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const botLogger = require('../services/botLogger');
const i18n = require('../localization');
const { checkCooldown, storePendingReply, clearPendingReply } = require('../services/cooldown');
const emojis = require('../media/emojis.json');

const feedbackHandler = require('./interactions/feedbackHandler');
const giveawayHandler = require('./interactions/giveawayHandler');
const voicemasterHandler = require('./interactions/voicemasterHandler');
const loggingHandler = require('./interactions/loggingHandler');
const welcomeHandler = require('./interactions/welcomeHandler');
const farewellHandler = require('./interactions/farewellHandler');
const reactionRolesHandler = require('./interactions/reactionRolesHandler');
const ticketHandler = require('./interactions/ticketHandler');
const containerBuilderHandler = require('./interactions/containerBuilderHandler');
const buttonRoleHandler = require('./interactions/buttonRoleHandler');
const embedHandler = require('./interactions/embedHandler');
const greetHandler = require('./interactions/greetHandler');
const ignoreDb = require('../database/ignoreDb');
const { isAdminLockEnabled } = require('../services/adminLock');
const commandLockDb = require('../database/commandLock');
const config = require('../settings');
const { buildRoleplayResponse, roleplayActions } = require('../services/roleplayHelper');

const handlers = [
  feedbackHandler,
  giveawayHandler,
  voicemasterHandler,
  loggingHandler,
  welcomeHandler,
  farewellHandler,
  reactionRolesHandler,
  ticketHandler,
  containerBuilderHandler,
  embedHandler,
  greetHandler,
  buttonRoleHandler
];

const iCache = new Map();
const ICACHE_TTL = 30000;

function iGetCached(key) {
  const entry = iCache.get(key);
  if (entry && Date.now() - entry.ts < ICACHE_TTL) return { hit: true, val: entry.val };
  return { hit: false };
}
function iSetCache(key, val) {
  iCache.set(key, { val, ts: Date.now() });
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of iCache) {
    if (now - v.ts >= ICACHE_TTL) iCache.delete(k);
  }
}, 60000);

async function getCachedIgnore(key, fetchFn) {
  const cached = iGetCached(key);
  if (cached.hit) return cached.val;
  const val = await fetchFn();
  iSetCache(key, val);
  return val;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // remember the user's Discord language (first time, or when it changes) — never overwrites a manual choice
    i18n.observe(interaction);

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Command not found: ${interaction.commandName}`);
        return;
      }

      const guildId = interaction.guild?.id;
      const userId = interaction.user.id;
      const channelId = interaction.channel?.id;

      if (guildId) {
        const [hasBypass, isUserIgnored, isChannelIgnored, isCommandIgnored] = await Promise.all([
          getCachedIgnore(`bypass:${guildId}:${userId}`, () => ignoreDb.getBypassUser(guildId, userId)),
          getCachedIgnore(`ignoredUser:${guildId}:${userId}`, () => ignoreDb.getIgnoredUser(guildId, userId)),
          getCachedIgnore(`ignoredChannel:${guildId}:${channelId}`, () => ignoreDb.getIgnoredChannel(guildId, channelId)),
          getCachedIgnore(`ignoredCmd:${guildId}:${interaction.commandName}`, () => ignoreDb.getIgnoredCommand(guildId, interaction.commandName))
        ]);

        if (!hasBypass) {
          if (isUserIgnored) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('This user is on ignored list')
              );
            return interaction.reply({
              components: [container],
              flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
              ephemeral: true
            });
          }

          if (isChannelIgnored && interaction.commandName !== 'ignore') {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('This channel is on ignored list')
              );
            await interaction.reply({
              components: [container],
              flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
              ephemeral: true
            });
            setTimeout(async () => {
              try { await interaction.deleteReply(); } catch (error) { }
            }, 3000);
            return;
          }

          if (isCommandIgnored && interaction.commandName !== 'ignore') {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('This command is on ignored list')
              );
            await interaction.reply({
              components: [container],
              flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
              ephemeral: true
            });
            setTimeout(async () => {
              try { await interaction.deleteReply(); } catch (error) { }
            }, 3000);
            return;
          }
        }
      }

      if (isAdminLockEnabled() && interaction.user.id !== config.OWNER_ID) {
        const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Admin Lock Active'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Commands are currently locked by the owner.'));

        return interaction.reply({
          components: [lockContainer],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      if ((await getCachedIgnore(`cmdLock:${interaction.commandName}`, () => commandLockDb.isLocked(interaction.commandName))) && interaction.user.id !== config.OWNER_ID) {
        const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Command Locked'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`The command **${interaction.commandName}** is currently locked by the owner.`));

        return interaction.reply({
          components: [lockContainer],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      if (interaction.user.id !== config.OWNER_ID) {
        const { onCooldown, remaining } = checkCooldown(interaction.user.id, interaction.commandName);
        if (onCooldown) {
          const cooldownContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Command Cooldown**`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Oi Stop!** You're doing it too fast. ${emojis.angry}\n-# Try again later in **${remaining}s**`)
            );
          await interaction.reply({
            components: [cooldownContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
          const timeoutId = setTimeout(async () => {
            try { await interaction.deleteReply(); } catch (_) {}
            clearPendingReply(interaction.user.id);
          }, parseFloat(remaining) * 1000);
          storePendingReply(interaction.user.id, timeoutId, async () => {
            try { await interaction.deleteReply(); } catch (_) {}
          });
          return;
        }
      }

      try {
        if (command.deferReply) {
          await interaction.deferReply({ ephemeral: command.deferEphemeral === true });
        }
        await command.execute(interaction);
        botLogger.logSlashCommand(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        botLogger.logError(error, `Slash command: /${interaction.commandName}`, interaction.client).catch(() => {});
        const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(errorMessage);
          } else if (interaction.deferred && !interaction.replied) {
            await interaction.editReply(errorMessage);
          }
        } catch (replyError) {
          console.error('Error sending error response:', replyError);
        }
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.includes('_back_')) {
      const customId = interaction.customId;

      if (customId.startsWith('j2c_')) {
        
      } else {
        const parts = customId.split('_back_');
        if (parts.length === 2) {
          const action = parts[0];
          const ids = parts[1].split('_');
          if (ids.length === 2 && roleplayActions[action]) {
            const [initiatorId, targetId] = ids;

            if (interaction.user.id !== targetId) {
              return interaction.reply({
                content: 'This button is not for you!',
                ephemeral: true
              });
            }

            try {
              await interaction.deferReply({ flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });
              const initiator = await interaction.client.users.fetch(initiatorId);
              const responder = interaction.user;
              const container = await buildRoleplayResponse(action, responder, initiator, false);

              if (container) {
                await interaction.editReply({
                  components: [container],
                  flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
                });
              } else {
                await interaction.editReply({ content: 'Failed to fetch GIF. Please try again later!' });
              }
            } catch (error) {
              console.error(`Error handling roleplay button ${action}:`, error);
              botLogger.logError(error, `Roleplay button: ${action}`, interaction.client).catch(() => {});
              try {
                const errorContent = 'There was an error processing this action!';
                if (!interaction.replied && !interaction.deferred) {
                  await interaction.reply({ content: errorContent, ephemeral: true });
                } else if (interaction.deferred && !interaction.replied) {
                  await interaction.editReply({ content: errorContent });
                }
              } catch (replyError) {
                console.error('Error sending error response:', replyError);
              }
            }
            return;
          }
        }
      }
    }

    for (const handler of handlers) {
      try {
        const handled = await handler.handle(interaction);
        if (handled) return;
      } catch (error) {
        console.error(`Handler error:`, error);
        botLogger.logError(error, `Interaction handler (${interaction.customId ?? interaction.type})`, interaction.client).catch(() => {});
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'An error occurred while processing this interaction.',
              flags: MessageFlags.Ephemeral
            });
          }
        } catch (replyError) {
          console.error('Error sending handler error response:', replyError);
        }
        return;
      }
    }
  }
};
