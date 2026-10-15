// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'rickroll',
  description: 'Detects if provided url is a rick-roll',
  aliases: [],
  
  async execute(message, args) {
    const url = args.join(' ');
    
    if (!url) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Missing URL')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Please provide a URL to check for Rick Roll!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Invalid URL')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('The provided URL format is invalid!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Analyzing URL')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Checking for Rick Roll content...')
      );
    
    const msg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const phrases = [
        "rickroll", "rick roll", "rick astley", "never gonna give you up"
      ];

      const source = response.data.toLowerCase();
      const rickRoll = phrases.some(phrase => source.includes(phrase));

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Rick Roll Detector')
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**URL:** ${url}`),
              new TextDisplayBuilder().setContent(`**Status:** ${rickRoll ? 'Rick Roll DETECTED!' : 'Safe - No Rick Roll found'}`)
            )
        );

      await msg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### URL Check Failed')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to check the URL. It might be invalid, unreachable, or protected.')
        );
      await msg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
