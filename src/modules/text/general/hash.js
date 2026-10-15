// @cashholy(carti) — hash

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const crypto = require('crypto');

module.exports = {
  name: 'hash',
  description: 'Hash text with various algorithms',
  usage: 'hash <algorithm> <text>',
  category: 'general',
  aliases: ['md5', 'sha1', 'sha256', 'sha512'],
  
  async execute(message, args) {
    if (args.length < 2) {
      const usageContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Usage:** \`hash <algorithm> <text>\`\n**Available algorithms:** md5, sha1, sha224, sha256, sha384, sha512, all`)
        );
      return message.reply({ components: [usageContainer], flags: MessageFlags.IsComponentsV2 });
    }

    const algorithm = args[0].toLowerCase();
    const text = args.slice(1).join(' ');

    const validAlgorithms = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'all'];
    
    if (!validAlgorithms.includes(algorithm)) {
      const invalidContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Invalid algorithm.**\n**Available algorithms:** md5, sha1, sha224, sha256, sha384, sha512, all`)
        );
      return message.reply({ components: [invalidContainer], flags: MessageFlags.IsComponentsV2 });
    }

    const algorithms = {
      'md5': crypto.createHash('md5').update(text).digest('hex'),
      'sha1': crypto.createHash('sha1').update(text).digest('hex'),
      'sha224': crypto.createHash('sha224').update(text).digest('hex'),
      'sha256': crypto.createHash('sha256').update(text).digest('hex'),
      'sha384': crypto.createHash('sha384').update(text).digest('hex'),
      'sha512': crypto.createHash('sha512').update(text).digest('hex'),
    };

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    const inputPreview = text.length > 50 ? text.substring(0, 50) + '...' : text;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Input:** ${inputPreview}\n**Length:** ${text.length} characters`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (algorithm === 'all') {
      for (const [algo, hash] of Object.entries(algorithms)) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${algo.toUpperCase()}**\n\`\`\`${hash}\`\`\``)
        );
      }
    } else {
      const hash = algorithms[algorithm];
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Algorithm:** ${algorithm.toUpperCase()}\n**Hash:**\n\`\`\`${hash}\`\`\``)
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
