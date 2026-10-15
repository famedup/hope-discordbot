/*! © 2026 cashholy (carti) !*/

// hope — gateway identify tweaks.
//
// Discord shows the "mobile" status icon for sessions that identify with the
// browser property "Discord iOS". This must be applied before client.login().

const MOBILE_BROWSER = 'Discord iOS';

function applyMobileIdentify() {
  // discord.js v14 builds its gateway on @discordjs/ws; its defaults are read
  // when the manager is created (at login), so patching them here is enough.
  try {
    const { DefaultWebSocketManagerOptions } = require('@discordjs/ws');
    DefaultWebSocketManagerOptions.identifyProperties = {
      ...DefaultWebSocketManagerOptions.identifyProperties,
      browser: MOBILE_BROWSER,
    };
    return true;
  } catch (_) {
    return false; // falls back to the `ws.properties` client option below
  }
}

/** Client options that older discord.js builds read for identify properties. */
const wsOptions = { properties: { browser: MOBILE_BROWSER } };

module.exports = { applyMobileIdentify, wsOptions, MOBILE_BROWSER };
