// ▛▀ cashholy (carti) ▀▜

// hope — voicemaster (vm)
// Private voice rooms: join the trigger channel and the room is yours.
//
//   /voicemaster setup    pick three channels, or let the bot build everything
//   /voicemaster config   see the current setup and repost the panel
//   /voicemaster reset    remove the setup

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../../services/ui');
const view = require('../../../services/voicemasterView');
const { J2CConfig, TempChannel } = require('../../../database/schemas');
const { startSession } = require('../../../events/interactions/voicemasterHandler');
const { invalidate } = require('../../../events/voiceStateUpdate');

const SUBCOMMANDS = ['setup', 'config', 'reset'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicemaster')
    .setDescription('Private voice rooms that members control themselves')
    .addSubcommand(s => s.setName('setup').setDescription('Set up voicemaster'))
    .addSubcommand(s => s.setName('config').setDescription('View the current voicemaster setup'))
    .addSubcommand(s => s.setName('reset').setDescription('Remove the voicemaster setup')),

  name: 'voicemaster',
  aliases: ['vm'],
  description: 'Private voice rooms that members control themselves',
  category: 'general',

  async execute(ctx, args = []) {
    const isSlash = ctx.isChatInputCommand?.() === true;
    const sub = isSlash ? ctx.options.getSubcommand() : args[0]?.toLowerCase();

    if (!SUBCOMMANDS.includes(sub)) return require('../../../services/helpMenu').sendHelp('voicemaster', ctx);
    if (!ctx.guild) return ui.say.error(ctx, 'Use this in a server.');
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ui.say.error(ctx, 'Only administrators can manage voicemaster.');
    }

    const user = ctx.user ?? ctx.author;
    const cfg = await J2CConfig.findOne({ where: { guildId: ctx.guild.id }, raw: true });

    if (sub === 'setup') {
      // opens pre-filled when voicemaster is already configured, so editing is one click
      const picks = startSession(ctx.guild.id, user.id, cfg
        ? { text: cfg.textChannelId, voice: cfg.voiceChannelId, category: cfg.categoryId }
        : {});
      return ui.send(ctx, view.setup({ picks }), { ephemeral: true });
    }

    if (sub === 'config') {
      if (!cfg) return ui.send(ctx, ui.info('voicemaster isn\'t set up here. Run `/voicemaster setup`.'), { ephemeral: true });
      const rooms = await TempChannel.count({ where: { guildId: ctx.guild.id } });
      return ui.send(ctx, view.config({ cfg, guild: ctx.guild, rooms }), { ephemeral: true });
    }

    // reset
    if (!cfg) return ui.send(ctx, ui.info('Nothing to reset. voicemaster isn\'t set up here.'), { ephemeral: true });
    await J2CConfig.destroy({ where: { guildId: ctx.guild.id } });
    invalidate?.(ctx.guild.id);
    return ui.send(ctx, ui.success('voicemaster has been reset.'), { ephemeral: true });
  },
};
