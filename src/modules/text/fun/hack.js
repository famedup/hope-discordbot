// dev: cashholy (carti) | module: hack

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'hack',
  description: 'Pretend to hack someone\'s discord account (for fun)',
  aliases: [],
  
  async execute(message, args) {
    const lawda = [
      '8', '3821', '23', '21', '313', '43', '29', '76', '11', '9',
      '44', '470', '318', '26', '69'
    ];

    const member = message.mentions.members.first();
    if (!member) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### No User Mentioned')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Please mention a member to 'hack'!")
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const processingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Hacking In Progress')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Processing to hack ${member.user.username}...\n\nConnecting to Discord servers...\nBypassing security...\nExtracting user data...`)
      );

    const lund = await message.reply({
      components: [processingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomPass = lawda[Math.floor(Math.random() * lawda.length)];
    const randomPass2 = Math.random().toString(36).substring(2, 5);
    const cleanUsername = member.user.username.replace(/[^a-zA-Z0-9]/g, '');
    
    const hackContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Hack Complete!')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**User:** ${member.user}\n**E-Mail:** ${cleanUsername}${randomPass}@gmail.com\n**Password:** ${member.user.username}@${randomPass2}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(member.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Hacked by:** ${message.author.username}`)
      );

    await message.reply({
      components: [hackContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    await lund.delete();
  },
};
