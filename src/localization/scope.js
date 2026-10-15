// ─── cashholy (carti) · developer ───

// hope — language scope.
//
// Only the commands listed in LOCALIZED reply in the user's language.
// Everything else (moderation, antinuke, automod, logging, tickets, welcome,
// the mention reply, giveaways, owner tools …) always answers in English, even
// if someone calls the translator from inside it. This is enforced centrally in
// i18n.translator(), so a command can never "leak" into another language by
// accident.
//
// To localize another command:
//   1. add its name here,
//   2. use `const tr = i18n.translator(ctx)` inside it,
//   3. add its strings to every file in ./locales (npm run check:i18n tells you
//      what is missing).

const LOCALIZED = new Set([
  // language + help
  'language', 'help',
  // information / utility
  'ping', 'avgping', 'uptime', 'users', 'botinfo',
  'userinfo', 'serverinfo', 'membercount', 'boostcount', 'avatar', 'banner', 'servericon',
]);

// Documentation only — these are intentionally NOT in LOCALIZED.
const ENGLISH_ONLY = [
  'mention reply (@bot)', 'moderation', 'antinuke', 'automod', 'logging',
  'tickets', 'welcome / farewell / boost', 'giveaways', 'owner commands',
];

const isLocalized = (commandName) => LOCALIZED.has(String(commandName || '').toLowerCase());

module.exports = { LOCALIZED, ENGLISH_ONLY, isLocalized };
