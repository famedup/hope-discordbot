// ▛▀ cashholy (carti) ▀▜

const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');

// Optional custom emojis (full tag, e.g. '<:wifi:1234567890123456789>').
// Left blank they are simply skipped, nothing breaks.
const PING_EMOJIS = {
  icon:  '<:latency:1554072152800624721>', // wifi / signal icon
  arrow: '<:barrow:1554071933031550996>', // arrow shown before the text; falls back to a plain "›"
};

const valid = (e) => /^<a?:\w+:\d+>$/.test(e || '');

function buildPingContainer(latency, tr) {
  const icon  = valid(PING_EMOJIS.icon)  ? `${PING_EMOJIS.icon} ` : '';
  const arrow = valid(PING_EMOJIS.arrow) ? PING_EMOJIS.arrow : '›';
  const t = tr || ((k, v) => (k === 'ping.unavailable' ? 'unavailable' : `Latency is **${v.value}**`));
  const value = latency < 0 ? t('ping.unavailable') : `${latency}ms`;

  return new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${icon}${arrow} ${t('ping.latency', { value })}`),
  );
}

module.exports = { buildPingContainer, PING_EMOJIS };
