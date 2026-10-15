/**
 * ┌ cashholy (carti)
 * └ modules/dual/antinuke/antinuke.js
 */

// hope — /antinuke. Opens the control panel; `on` / `off` flip it without opening it.

const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../../services/ui');
const panel = require('../../../services/antinukePanel');
const { AntinukeConfig } = require('../../../database/schemas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Protect your server from nuking attacks')
    .addStringOption(o => o.setName('action').setDescription('What to do')
      .addChoices({ name: 'Open panel', value: 'panel' }, { name: 'Turn on', value: 'on' }, { name: 'Turn off', value: 'off' })),

  name: 'antinuke',
  aliases: ['an'],
  description: 'Protect your server from nuking attacks',
  category: 'security',

  async execute(ctx, args = []) {
    const slash = ctx.isChatInputCommand?.();
    const action = String((slash ? ctx.options.getString('action') : args[0]) ?? 'panel').toLowerCase();
    const guild = ctx.guild;
    if (!guild) return ui.say.error(ctx, 'Use this in a server');

    if (['on', 'enable', 'off', 'disable'].includes(action)) {
      const level = await panel.accessOf(guild, (ctx.user ?? ctx.author).id);
      if (level !== 'owner' && level !== 'extra') return ui.say.error(ctx, 'Only the server owner and extra owners can do that');
      const row = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
      if (!row) return panel.open(ctx);
      const on = action === 'on' || action === 'enable';
      await row.update({ enabled: on });
      require('../../../events/antinuke/antinukeEvents').bust(guild.id);
      return ui.say.success(ctx, on ? 'Antinuke is on' : 'Antinuke is off');
    }
    return panel.open(ctx);
  },
};
