// [dev] cashholy (carti) :: modules/text/ignore/command/add.js

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { addIgnoredCommand, getIgnoredCommand, getIgnoredCommandsCount } = require('../../../../database/ignoreDb');

module.exports = {
  name: 'add',
  description: 'Add a command to the ignore list',
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Permission Denied**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You need Administrator permission to use this command.')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Invalid Usage**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Please provide a command name.\n\n**Usage:** `ignore command add <command>`')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const commandName = args[0].toLowerCase().trim();

    const commandExists = message.client.prefixCommands.has(commandName) || 
                          message.client.commands.has(commandName);
    
    if (!commandExists) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Invalid Command**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\`${commandName}\` is not a valid command.`)
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const count = getIgnoredCommandsCount(message.guild.id);
    if (count >= 25) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Limit Reached**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You can only add up to 25 commands to the ignore list.')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const existing = getIgnoredCommand(message.guild.id, commandName);
    if (existing) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Already Ignored**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\`${commandName}\` is already in the ignore commands list.`)
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      addIgnoredCommand(message.guild.id, commandName);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Success**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Successfully added \`${commandName}\` to the ignore commands list.`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error adding ignored command:', error);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Error**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to add command to ignore list. Please try again.')
        );
      
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
