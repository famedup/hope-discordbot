// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'token',
  description: 'Generate a fake token for a user',
  aliases: [],
  
  async execute(message, args) {
    const list = [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
      "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "_",
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0',
      '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];

    let token = '';
    for (let i = 0; i < 59; i++) {
      token += list[Math.floor(Math.random() * list.length)];
    }

    const user = message.mentions.users.first() || message.author;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Fake Token Generator')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${user.username}'s Token**`),
            new TextDisplayBuilder().setContent(`\`\`\`\n${token}\`\`\``)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
          )
      )
      message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
