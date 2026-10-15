// »» engineered by cashholy (carti) ««

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../media/emojis.json');

module.exports = {
  name: 'ascii85',
  description: 'Encode text to ASCII85',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Usage: \`ascii85 <text>\``)
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
      const buffer = Buffer.from(text);
      let encoded = '';
      
      for (let i = 0; i < buffer.length; i += 4) {
        let value = 0;
        const chunk = buffer.slice(i, i + 4);
        
        for (let j = 0; j < chunk.length; j++) {
          value = value * 256 + chunk[j];
        }
        
        if (chunk.length < 4) {
          value *= Math.pow(256, 4 - chunk.length);
        }
        
        if (value === 0 && chunk.length === 4) {
          encoded += 'z';
        } else {
          let result = '';
          for (let j = 0; j < 5; j++) {
            result = String.fromCharCode(33 + (value % 85)) + result;
            value = Math.floor(value / 85);
          }
          encoded += result.slice(0, chunk.length + 1);
        }
      }
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# ASCII85 encoding`)
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode to ASCII85`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }
  },
};
