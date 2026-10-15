/* ---
   author : cashholy (carti)
   module : ignore
   --- */

const fs = require('fs');
const path = require('path');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

const subcommands = new Map();

const subcommandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'ignore.js');
for (const file of subcommandFiles) {
  const subcommand = require(path.join(__dirname, file));
  if (subcommand.name && subcommand.execute) {
    subcommands.set(subcommand.name, subcommand);
  }
}

const commandPath = path.join(__dirname, 'command');
if (fs.existsSync(commandPath)) {
  const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const subcommand = require(path.join(commandPath, file));
    if (subcommand.name && subcommand.execute) {
      subcommands.set(`command-${subcommand.name}`, subcommand);
    }
  }
}

const channelPath = path.join(__dirname, 'channel');
if (fs.existsSync(channelPath)) {
  const channelFiles = fs.readdirSync(channelPath).filter(file => file.endsWith('.js'));
  for (const file of channelFiles) {
    const subcommand = require(path.join(channelPath, file));
    if (subcommand.name && subcommand.execute) {
      subcommands.set(`channel-${subcommand.name}`, subcommand);
    }
  }
}

const userPath = path.join(__dirname, 'user');
if (fs.existsSync(userPath)) {
  const userFiles = fs.readdirSync(userPath).filter(file => file.endsWith('.js'));
  for (const file of userFiles) {
    const subcommand = require(path.join(userPath, file));
    if (subcommand.name && subcommand.execute) {
      subcommands.set(`user-${subcommand.name}`, subcommand);
    }
  }
}

const bypassPath = path.join(__dirname, 'bypass');
if (fs.existsSync(bypassPath)) {
  const bypassFiles = fs.readdirSync(bypassPath).filter(file => file.endsWith('.js'));
  for (const file of bypassFiles) {
    const subcommand = require(path.join(bypassPath, file));
    if (subcommand.name && subcommand.execute) {
      subcommands.set(`bypass-${subcommand.name}`, subcommand);
    }
  }
}

module.exports = {
  name: 'ignore',
  description: 'Manage ignored commands, channels, users, and bypass users',
  usage: 'ignore <command|channel|user|bypass> <add|remove|show>',
  category: 'moderation',
  allowMediaChannel: true,
  
  async execute(message, args) {
    if (args.length === 0) {
      return require('../../../services/helpMenu').sendHelp('ignore', message);
    }

    const category = args[0].toLowerCase();
    let subcommand;

    if (['command', 'channel', 'user', 'bypass'].includes(category) && args.length > 1) {
      const action = args[1].toLowerCase();
      subcommand = subcommands.get(`${category}-${action}`);
      if (subcommand) {
        return await subcommand.execute(message, args.slice(2));
      }
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Unknown Subcommand**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Unknown subcommand '${category}'. Use \`ignore\` to see available commands.`
      )
    );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
