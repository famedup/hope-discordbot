// »» engineered by cashholy (carti) ««

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

const SPECIAL_USER_ID = '544047377540186114';
const SMART_USER_ID = '1124248109472550993';

function getReaction(rate, specialType = null) {
  if (specialType === 'dumb') return "The dumbest person to ever exist... beyond measurement!";
  if (specialType === 'smart') return "Sucks to be you bozo";
  if (rate === 0) return "Genius level IQ detected!";
  if (rate <= 20) return "Pretty smart actually...";
  if (rate <= 40) return "Average brain capacity";
  if (rate <= 60) return "Hmmm... questionable decisions";
  if (rate <= 80) return "Brain cells leaving the chat";
  if (rate < 100) return "How do you remember to breathe?";
  return "Certified smooth brain moment";
}

module.exports = {
  name: 'howdumb',
  description: 'Sends you your dumb rate',
  aliases: ['dumb'],
  
  async execute(message, args) {
    const User = message.mentions.members.first();
    
    if (!User) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### No User Mentioned')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Please mention a user to check their dumb rate!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const isDumb = User.id === SPECIAL_USER_ID;
    const isSmart = User.id === SMART_USER_ID;
    const specialType = isDumb ? 'dumb' : (isSmart ? 'smart' : null);
    const dumbrate = isDumb ? 101 : Math.floor(Math.random() * 101);
    const reaction = getReaction(dumbrate, specialType);

    let displayText;
    if (isSmart) {
      displayText = `**${User} is 1000% more intelligent than you!**\n\n*${reaction}*`;
    } else {
      displayText = `**${User} is ${dumbrate}% dumb!**\n\n*${reaction}*`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Dumb Rate Checker')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(displayText)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(User.displayAvatarURL({ size: 128 }))
          )
      );
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
