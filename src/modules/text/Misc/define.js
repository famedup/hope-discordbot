//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'define',
  description: 'Get Urban Dictionary definition of a word',
  aliases: ['urban', 'ud'],
  
  async execute(message, args) {
    if (!args.length) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Missing Word\n*Error occurred*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Please provide a word to define!\nUsage: `define <word>`')
        );
      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const phrase = args.join(' ');

    try {
      const response = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(phrase)}`);
      const data = response.data;

      if (!data.list || data.list.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Not Found\n*No definition available*`)
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`No definition found for **${phrase}**`)
          );
        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const definition = data.list[0];
      const cleanDefinition = definition.definition.replace(/\[|\]/g, '').substring(0, 1024);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Definition for ${phrase}**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${cleanDefinition}`)
        );

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# API Error\n*Error occurred*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to fetch definition from Urban Dictionary. Please try again later.')
        );
      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
