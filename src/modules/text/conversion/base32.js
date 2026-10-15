// [dev] cashholy (carti) :: modules/text/conversion/base32.js

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../media/emojis.json');

module.exports = {
  name: 'base32',
  description: 'Encode text to Base32',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Usage: \`base32 <text>\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const text = args.join(' ');
    
    if (text.length > 1000) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Text too long (max 1000)`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    try {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const buffer = Buffer.from(text);
      let encoded = '';
      let bits = 0;
      let value = 0;

      for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
          encoded += alphabet[(value >>> (bits - 5)) & 31];
          bits -= 5;
        }
      }

      if (bits > 0) {
        encoded += alphabet[(value << (5 - bits)) & 31];
      }

      while (encoded.length % 8 !== 0) {
        encoded += '=';
      }
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# Base32 encoding`)
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode to Base32`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }
  },
};
