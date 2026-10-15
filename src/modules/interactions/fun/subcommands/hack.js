/**
 * ┌ cashholy (carti)
 * └ modules/interactions/fun/subcommands/hack.js
 */

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
  
  async execute(interaction) {
    const lawda = [
      '8', '3821', '23', '21', '313', '43', '29', '76', '11', '9',
      '44', '470', '318', '26', '69'
    ];

    const member = interaction.options.getMember('user');
    const user = interaction.options.getUser('user');

    const processingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Hacking In Progress`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Connecting to Discord servers...\nBypassing security...\nExtracting user data...`)
      );

    await interaction.reply({
      components: [processingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomPass = lawda[Math.floor(Math.random() * lawda.length)];
    const randomPass2 = Math.random().toString(36).substring(2, 5);
    const cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '');
    
    const hackContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Hack Complete`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**"Extracted" Data**`),
            new TextDisplayBuilder().setContent(`**User:** ${user}\n**E-Mail:** ${cleanUsername}${randomPass}@gmail.com\n**Password:** ${user.username}@${randomPass2}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`"Hacked" by ${interaction.user.username}`)
      );

    await interaction.editReply({
      components: [hackContainer],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
