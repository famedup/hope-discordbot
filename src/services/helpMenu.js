// »» engineered by cashholy (carti) ««

// hope — help engine.
// `registry` holds the raw command data; CATEGORIES groups it into five
// modules. The menu is two stacked cards: a content card (overview, command
// list or search results) and a "dock" with the dropdowns and buttons.
// Every module that calls sendHelp(key, ctx) lands on this same layout.

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const ui = require('./ui');
const i18n = require('../localization');
const { roleplayActions } = require('./roleplayHelper');
const config = require('../settings');
const emojis = require('../media/emojis.json');

const registry = {
  general: {
    title: 'General Commands',
    commands: [
      { name: 'status',           description: 'Check the bot\'s current status' },
      { name: 'avatar [user]',    description: 'View a user\'s avatar' },
      { name: 'banner [user]',    description: 'View a user\'s banner' },
      { name: 'servericon',       description: 'View the server\'s icon' },
      { name: 'membercount',      description: 'Show the server member count' },
      { name: 'boostcount',       description: 'Show the server boost count' },
      { name: 'urban <word>',     description: 'Look up a word on Urban Dictionary' },
      { name: 'hash <text>',      description: 'Generate a hash of the given text' },
      { name: 'snipe',            description: 'Retrieve the last deleted message' },
      { name: 'editsnipe',        description: 'Retrieve the last edited message' },
      { name: 'purge <amount>',   description: 'Bulk delete messages in a channel' },
      { name: 'steal <emoji>',    description: 'Add an emoji to this server' },
      { name: 'remind <time> <text>', description: 'Set a reminder' },
      { name: 'setprefix <prefix>', description: 'Change the prefix for this server' },
      { name: 'settings', description: 'Customize the bot for this server (alias: customize)' },
      { name: 'list boosters',    description: 'List all current server boosters' },
      { name: 'list inrole',      description: 'List members in a specific role' },
      { name: 'list emojis',      description: 'List all server emojis' },
      { name: 'list bots',        description: 'List all bots in the server' },
      { name: 'list admins',      description: 'List all admins in the server' },
      { name: 'list invoice',     description: 'List users with no server roles' },
      { name: 'list mods',        description: 'List all moderators in the server' },
      { name: 'list early',       description: 'List early supporters in the server' },
      { name: 'list createpos',   description: 'List members sorted by account creation' },
      { name: 'list roles',       description: 'List all roles in the server' },
    ]
  },
  info: {
    title: 'Information Commands',
    commands: [
      { name: 'userinfo [user]',  description: 'View detailed info about a user' },
      { name: 'serverinfo',       description: 'View detailed info about the server' },
      { name: 'invite',           description: 'Get an invite link for the bot' },
      { name: 'users',            description: 'Show the total user count' },
      { name: 'botinfo',          description: 'View detailed bot information' },
      { name: 'ping',             description: 'Check the bot\'s response time' },
      { name: 'avgping',          description: 'Check the bot\'s average latency' },
      { name: 'uptime',           description: 'Show how long the bot has been online' },
      { name: 'help [command]',   description: 'Show the help menu or a specific command' },
    ]
  },
  stats: {
    title: 'Stats Commands',
    commands: [
      { name: 'permissions [user]',   description: 'Show permissions for a user' },
      { name: 'rolecall <role>',       description: 'Display member count for a role' },
      { name: 'rolecount',             description: 'Show all roles and their member counts' },
      { name: 'roleinfo <role>',       description: 'View detailed info about a role' },
      { name: 'roleperms <role>',      description: 'Show permissions granted by a role' },
      { name: 'topic [channel]',       description: 'Show a channel\'s current topic' },
      { name: 'channelinfo [channel]', description: 'View info about a channel' },
      { name: 'emojiinfo <emoji>',     description: 'View info about an emoji' },
      { name: 'emojistats',            description: 'Show emoji usage statistics' },
      { name: 'emptyroles',            description: 'List roles with no members' },
      { name: 'firstjoins',            description: 'Show the first members to join' },
      { name: 'joined [user]',         description: 'Show when a user joined the server' },
      { name: 'joinedatpos <pos>',     description: 'Show who joined at a given position' },
      { name: 'joinpos [user]',        description: 'Show a user\'s join position' },
      { name: 'lastjoins',             description: 'Show the most recent joins' },
      { name: 'listchannels',          description: 'List all server channels' },
    ]
  },
  fun: {
    title: 'Fun Commands',
    commands: [
      { name: 'howdumb [user]',      description: 'Rate how dumb someone is' },
      { name: 'howgay [user]',       description: 'Rate someone\'s gay percentage' },
      { name: 'dare',                description: 'Get a random dare' },
      { name: 'truth',               description: 'Get a random truth question' },
      { name: 'simprate [user]',     description: 'Rate how much of a simp someone is' },
      { name: 'pickup',              description: 'Get a random pickup line' },
      { name: 'rickroll [user]',     description: 'Send a rickroll link' },
      { name: 'meme',                description: 'Get a random meme' },
      { name: 'nitro',               description: 'Generate a fake Nitro link' },
      { name: 'token',               description: 'Generate a fake bot token' },
      { name: 'texttoemoji <text>',  description: 'Convert text to emoji letters' },
      { name: 'wizz',                description: 'Send a fake screen-wiz effect' },
      { name: 'hack [user]',         description: 'Fake hack a user' },
      { name: 'ship [user1] [user2]', description: 'Match two people, or you with a random member' },
    ]
  },
  social: {
    title: 'Social Commands',
    commands: [
      { name: 'youtube <query>',    description: 'Search YouTube for a video' },
      { name: 'github <user>',      description: 'Look up a GitHub profile' },
      { name: 'wikipedia <query>',  description: 'Search Wikipedia for an article' },
      { name: 'news <query>',       description: 'Search for latest news articles' },
      { name: 'google <query>',     description: 'Search Google' },
      { name: 'ping',               description: 'Check the bot\'s response time' },
    ]
  },
  roleplay: {
    title: 'Roleplay Commands',
    // 70 anime GIF actions from gifcdn; also available as /roleplay <action> [user]
    commands: [
      { name: 'roleplay <action> [user]', description: 'Any action below, also as /roleplay' },
      ...Object.entries(roleplayActions).map(([k, v]) => ({
        name: `${k} [user]`,
        description: `Send a ${k} GIF${v.back ? ', they can reply' : ''}${k === 'run' ? ' (use rp run)' : ''}`,
      })),
    ]
  },
  animals: {
    title: 'Animals Commands',
    commands: [
      { name: 'cat',        description: 'Get a random cat image' },
      { name: 'dog',        description: 'Get a random dog image' },
      { name: 'fox',        description: 'Get a random fox image' },
      { name: 'duck',       description: 'Get a random duck image' },
      { name: 'panda',      description: 'Get a random panda image' },
      { name: 'redpanda',   description: 'Get a random red panda image' },
      { name: 'bird',       description: 'Get a random bird image' },
      { name: 'bunny',      description: 'Get a random bunny image' },
      { name: 'bear',       description: 'Get a random bear image' },
      { name: 'pig',        description: 'Get a random pig image' },
      { name: 'possum',     description: 'Get a random possum image' },
      { name: 'sheep',      description: 'Get a random sheep image' },
      { name: 'snake',      description: 'Get a random snake image' },
      { name: 'squirrel',   description: 'Get a random squirrel image' },
      { name: 'animalfact', description: 'Get a random animal fact' },
    ]
  },
  moderation: {
    title: 'Moderation Commands',
    commands: [
      { name: 'kick <user> [reason]',           description: 'Kick a user from the server' },
      { name: 'ban <user> [reason]',            description: 'Ban a user from the server' },
      { name: 'softban <user> [reason]',        description: 'Ban and unban to delete messages' },
      { name: 'unban <user>',                   description: 'Unban a user from the server' },
      { name: 'slowmode <seconds> [channel]',   description: 'Set slowmode for a channel' },
      { name: 'lock [channel] [reason]',        description: 'Lock a channel for everyone' },
      { name: 'unlock [channel] [reason]',      description: 'Unlock a channel' },
      { name: 'hide [channel] [reason]',        description: 'Hide a channel from everyone' },
      { name: 'unhide [channel] [reason]',      description: 'Make a hidden channel visible' },
      { name: 'lockthread [thread] [reason]',   description: 'Lock a thread (alias: lt)' },
      { name: 'unlockthread [thread]',          description: 'Unlock a thread (alias: ult)' },
      { name: 'hidethread [thread] [reason]',   description: 'Archive and lock a thread (alias: ht)' },
      { name: 'unhidethread [thread]',          description: 'Restore a hidden thread (alias: uht)' },
      { name: 'clone [channel] [name]',         description: 'Copy a channel with its permissions' },
      { name: 'nuke [channel]',                 description: 'Recreate a channel to wipe it, asks first' },
      { name: 'tempban <user> <dur> [reason]',  description: 'Temporarily ban a user' },
      { name: 'mute <user> [reason]',           description: 'Mute a user' },
      { name: 'unmute <user>',                  description: 'Unmute a user' },
      { name: 'temprole <user> <role> <dur>',   description: 'Temporarily assign a role' },
      { name: 'rolegive <user> <role>',         description: 'Give a role to a user' },
      { name: 'roleremove <user> <role>',       description: 'Remove a role from a user' },
      { name: 'nick <user> [nickname]',         description: 'Change or remove a member\'s server nickname' },
    ]
  },
  files: {
    title: 'Server Files Commands',
    commands: [
      { name: 'dumpsettings',      description: 'Export server settings to a file' },
      { name: 'dumproles',         description: 'Export all roles to a file' },
      { name: 'dumpchannels',      description: 'Export all text channels to a file' },
      { name: 'dumpvoicechannels', description: 'Export all voice channels to a file' },
      { name: 'dumpcategories',    description: 'Export all categories to a file' },
      { name: 'dumpemotes',        description: 'Export all server emojis to a file' },
      { name: 'dumpmessages',      description: 'Export messages from a channel' },
      { name: 'dumphumans',        description: 'Export all human members to a file' },
      { name: 'dumpbots',          description: 'Export all bots to a file' },
      { name: 'dumpusers',         description: 'Export all users to a file' },
      { name: 'dumpbans',          description: 'Export all banned users to a file' },
      { name: 'dumpwarns',         description: 'Export all warnings to a file' },
    ]
  },
  giveaway: {
    title: 'Giveaway Commands',
    commands: [
      { name: 'start',   description: 'Start a new giveaway' },
      { name: 'end',     description: 'End an active giveaway early' },
      { name: 'reroll',  description: 'Reroll the winner of a giveaway' },
    ]
  },
  vanity: {
    title: 'Vanity Roles Commands',
    commands: [
      { name: 'setup',   description: 'Setup vanity roles for this server' },
      { name: 'config',  description: 'View current vanity role configuration' },
      { name: 'reset',   description: 'Reset all vanity role settings' },
    ]
  },
  voicemaster: {
    title: 'VoiceMaster Commands',
    commands: [
      { name: 'setup',   description: 'Set up private voice rooms (pick channels or auto-build)' },
      { name: 'config',  description: 'View the voicemaster setup and repost the panel' },
      { name: 'reset',   description: 'Remove the voicemaster setup' },
    ]
  },
  automod: {
    title: 'AutoMod Commands',
    commands: [
      { name: 'panel', description: 'Open the automod panel: filters, actions, exemptions, word list, AI' },
      { name: 'on',    description: 'Turn automod on' },
      { name: 'off',   description: 'Turn automod off' },
    ]
  },
  antinuke: {
    title: 'Antinuke Commands',
    commands: [
      { name: 'panel', description: 'Open the antinuke panel: protections, limits, trusted members, AI Guard' },
      { name: 'on',    description: 'Turn antinuke on' },
      { name: 'off',   description: 'Turn antinuke off' },
    ]
  },
  logging: {
    title: 'Logging Commands',
    commands: [
      { name: 'setup',  description: 'Setup logging channels for this server' },
      { name: 'config', description: 'View current logging configuration' },
      { name: 'reset',  description: 'Reset all logging settings' },
    ]
  },
  crypto: {
    title: 'Crypto Commands',
    commands: [
      { name: 'balance',     description: 'Check a wallet balance for a given coin and address' },
      { name: 'price',       description: 'Get the current price of a cryptocurrency' },
      { name: 'convert',     description: 'Convert an amount between two cryptocurrencies' },
      { name: 'transaction', description: 'View recent transactions for an address' },
      { name: 'news',        description: 'Latest crypto news headlines' },
      { name: 'gainers',     description: 'Top gaining coins in the last 24h' },
      { name: 'losers',      description: 'Top losing coins in the last 24h' },
    ]
  },
  feedback: {
    title: 'Feedback Commands',
    commands: [
      { name: 'setup',  description: 'Configure the feedback system with channel select menus' },
      { name: 'panel',  description: 'Send the feedback panel to the review channel' },
      { name: 'config', description: 'View current feedback configuration' },
      { name: 'reset',  description: 'Reset feedback configuration for this server' },
    ]
  },
  blacklist: {
    title: 'Blacklist Commands',
    commands: [
      { name: 'guild add',    description: 'Blacklist a guild by ID' },
      { name: 'guild remove', description: 'Remove a guild from the blacklist' },
      { name: 'guild list',   description: 'Show all blacklisted guilds' },
      { name: 'user add',     description: 'Blacklist a user by ID' },
      { name: 'user remove',  description: 'Remove a user from the blacklist' },
      { name: 'user list',    description: 'Show all blacklisted users' },
    ]
  },
  ignore: {
    title: 'Ignore Commands',
    commands: [
      { name: 'command add',    description: 'Add a command to the ignore list' },
      { name: 'command remove', description: 'Remove a command from the ignore list' },
      { name: 'command show',   description: 'Show all ignored commands' },
      { name: 'channel add',    description: 'Add a channel to the ignore list' },
      { name: 'channel remove', description: 'Remove a channel from the ignore list' },
      { name: 'channel show',   description: 'Show all ignored channels' },
      { name: 'user add',       description: 'Add a user to the ignore list' },
      { name: 'user remove',    description: 'Remove a user from the ignore list' },
      { name: 'user show',      description: 'Show all ignored users' },
      { name: 'bypass add',     description: 'Add a user to the bypass list' },
      { name: 'bypass remove',  description: 'Remove a user from the bypass list' },
      { name: 'bypass show',    description: 'Show all bypass users' },
    ]
  },
  media: {
    title: 'Media Commands',
    commands: [
      { name: 'setup',         description: 'Set up a media-only channel' },
      { name: 'remove',        description: 'Remove the media-only channel restriction' },
      { name: 'config',        description: 'View current media channel configuration' },
      { name: 'bypass add',    description: 'Add a user to the media bypass list' },
      { name: 'bypass remove', description: 'Remove a user from the media bypass list' },
      { name: 'bypass show',   description: 'Show all users in the bypass list' },
    ]
  },
  todo: {
    title: 'Todo Commands',
    commands: [
      { name: 'add <task>',  description: 'Add a new task to your list' },
      { name: 'list',        description: 'View all your current tasks' },
      { name: 'remove <id>', description: 'Remove a task by its ID' },
      { name: 'clear',       description: 'Clear all tasks at once' },
    ]
  },
  voice: {
    title: 'Voice Commands',
    commands: [
      { name: 'kick <user>',           description: 'Kick a user from voice' },
      { name: 'kickall [channel]',     description: 'Kick all users from a channel' },
      { name: 'mute <user>',           description: 'Server mute a user' },
      { name: 'muteall [channel]',     description: 'Mute all users in a channel' },
      { name: 'unmute <user>',         description: 'Server unmute a user' },
      { name: 'unmuteall [channel]',   description: 'Unmute all users in a channel' },
      { name: 'deafen <user>',         description: 'Server deafen a user' },
      { name: 'deafenall [channel]',   description: 'Deafen all users in a channel' },
      { name: 'undeafen <user>',       description: 'Server undeafen a user' },
      { name: 'undeafenall [channel]', description: 'Undeafen all users in a channel' },
      { name: 'move <user> <ch>',      description: 'Move a user to a channel' },
      { name: 'moveall <from> <to>',   description: 'Move all users between channels' },
      { name: 'pull <user>',           description: 'Pull a user to your channel' },
      { name: 'pullall <channel>',     description: 'Pull all users to your channel' },
      { name: 'lock [channel]',        description: 'Lock a voice channel' },
      { name: 'unlock [channel]',      description: 'Unlock a voice channel' },
      { name: 'private [channel]',     description: 'Make a channel private' },
      { name: 'unprivate [channel]',   description: 'Make a channel public again' },
    ]
  },
  ai: {
    title: 'AI Commands',
    commands: [
      { name: 'ask <prompt>',     description: 'Ask the AI anything' },
      { name: 'analyse <image>',  description: 'Analyse an image using AI' },
      { name: 'enable',           description: 'Enable AI auto-response in this server' },
      { name: 'disable',          description: 'Disable AI auto-response in this server' },
    ]
  },
  autoreact: {
    title: 'AutoReact Commands',
    commands: [
      { name: 'add <word> <emoji>', description: 'Add a trigger word with an emoji reaction' },
      { name: 'remove <word>',      description: 'Remove a trigger word and its reactions' },
      { name: 'list',               description: 'List all triggers and their emojis' },
      { name: 'reset',              description: 'Reset all triggers and reactions' },
    ]
  },
  embed: {
    title: 'Embed Commands',
    commands: [
      { name: 'create <name>',            description: 'Create a new embed and open the editor' },
      { name: 'edit all <embed>',         description: 'Open the full embed editor' },
      { name: 'edit title <embed>',       description: 'Edit the title' },
      { name: 'edit description <embed>', description: 'Edit the description' },
      { name: 'edit color <embed>',       description: 'Edit the color' },
      { name: 'edit author <embed>',      description: 'Edit the author' },
      { name: 'edit footer <embed>',      description: 'Edit the footer' },
      { name: 'edit image <embed>',       description: 'Edit the large image' },
      { name: 'edit thumbnail <embed>',   description: 'Edit the thumbnail' },
      { name: 'edit timestamp <embed>',   description: 'Turn the timestamp on or off' },
      { name: 'edit fields <embed>',      description: 'Add, edit and reorder fields' },
      { name: 'edit buttons <embed>',     description: 'Add link, role and reply buttons' },
      { name: 'send <embed> [channel]',   description: 'Send an embed to a channel' },
      { name: 'list',                     description: 'View all embeds in this server' },
      { name: 'delete <embed>',           description: 'Delete an embed' },
      { name: 'variables',                description: 'See every variable, like {user} and {server}' },
    ]
  },
  container: {
    title: 'Container Commands',
    commands: [
      { name: 'create <name>',         description: 'Create a container message and open the builder' },
      { name: 'edit <container>',      description: 'Open the builder: text, images, buttons, more containers' },
      { name: 'send <container>',      description: 'Send a container to a channel' },
      { name: 'preview <container>',   description: 'See a container just for you' },
      { name: 'copy <container> <name>', description: 'Duplicate a container' },
      { name: 'delete <container>',    description: 'Delete a container' },
      { name: 'list',                  description: 'View every saved container' },
      { name: 'variables',             description: 'Tags you can use in containers' },
    ]
  },
  boost: {
    title: 'Boost Commands',
    commands: [
      { name: '',       description: 'Open the boost panel: channel, message, embed or container' },
      { name: 'test',   description: 'Preview the boost message using your profile' },
      { name: 'reset',  description: 'Reset the boost message' },
    ]
  },
  welcome: {
    title: 'Welcome Commands',
    commands: [
      { name: '',       description: 'Open the welcome panel: channel, message, embed or container' },
      { name: 'test',   description: 'Preview the welcome message using your profile' },
      { name: 'reset',  description: 'Reset the welcome message' },
    ]
  },
  farewell: {
    title: 'Farewell Commands',
    commands: [
      { name: '',       description: 'Open the farewell panel: channel, message, embed or container' },
      { name: 'test',   description: 'Preview the farewell message using your profile' },
      { name: 'reset',  description: 'Reset the farewell message' },
    ]
  },
  leaderboard: {
    title: 'Leaderboard Commands',
    commands: [
      { name: 'messages', description: 'View the all-time message leaderboard' },
      { name: 'invites',  description: 'View the invite leaderboard' },
    ]
  },
  userprofile: {
    title: 'User Profile Commands',
    commands: [
      { name: 'view [user]',         description: 'View a user\'s profile' },
      { name: 'description <text>',  description: 'Set your profile description' },
      { name: 'social <platform>',   description: 'Add a social link to your profile' },
      { name: 'background <url>',    description: 'Set your profile background image' },
      { name: 'reset',               description: 'Reset your profile to default' },
      { name: 'card',                description: 'View your full profile card' },
    ]
  },
  botprofile: {
    title: 'Bot Profile Commands',
    commands: [
      { name: 'serveravatar',      description: 'View the bot\'s server avatar' },
      { name: 'serverbanner',      description: 'View the bot\'s server banner' },
      { name: 'serverbio',         description: 'View the bot\'s server bio' },
      { name: 'servername',        description: 'View the bot\'s server display name' },
      { name: 'serverresetprofile',description: 'Reset the bot\'s server profile' },
    ]
  },
  pfps: {
    title: 'Profile Pictures Commands',
    commands: [
      { name: 'anime',    description: 'Get a random anime profile picture' },
      { name: 'male',     description: 'Get a random male profile picture' },
      { name: 'female',   description: 'Get a random female profile picture' },
    ]
  },
  misc: {
    title: 'Misc Commands',
    commands: [
      { name: 'calc <expression>', description: 'Calculate a math expression' },
      { name: 'define <word>',     description: 'Get the definition of a word' },
      { name: 'matrix',            description: 'Display a Matrix-style animation' },
      { name: 'size [user]',       description: 'Get a size rating' },
      { name: 'afk [reason]', description: 'Set your AFK status, the reason is optional' },
    ]
  },
  conversion: {
    title: 'Conversion Commands',
    commands: [
      { name: 'kg <value>',      description: 'Convert kilograms to pounds' },
      { name: 'ft <value>',      description: 'Convert feet to centimeters' },
      { name: 'cm <value>',      description: 'Convert centimeters to feet' },
      { name: 'hexdec <value>',  description: 'Convert hexadecimal to decimal' },
      { name: 'dechex <value>',  description: 'Convert decimal to hexadecimal' },
      { name: 'strbin <text>',   description: 'Convert text to binary' },
      { name: 'binstr <binary>', description: 'Convert binary to text' },
      { name: 'binint <binary>', description: 'Convert binary to integer' },
      { name: 'intbin <int>',    description: 'Convert integer to binary' },
      { name: 'encode <text>',   description: 'Encode text to base64' },
      { name: 'ascii85 <text>',  description: 'Encode text using ASCII85' },
      { name: 'rot13 <text>',    description: 'Apply ROT13 encoding to text' },
      { name: 'base32 <text>',   description: 'Encode text in base32' },
      { name: 'hex <text>',      description: 'Convert text to hexadecimal' },
    ]
  },
  tracking: {
    title: 'Tracking Commands',
    commands: [
      { name: 'leaderboard messages', description: 'View the all-time message leaderboard' },
      { name: 'leaderboard invites',  description: 'View the invite leaderboard' },
      { name: 'messages [user]',      description: 'Check message count for a user' },
      { name: 'invites [user]',       description: 'Check invite count for a user' },
    ]
  },
  reactionroles: {
    title: 'Reaction Roles Commands',
    commands: [
      { name: 'setup',  description: 'Setup a reaction roles message' },
      { name: 'remove', description: 'Remove a reaction roles setup' },
    ]
  },
  autopost: {
    title: 'Autopost Commands',
    commands: [
      { name: 'add <female/male/anime/random> <#channel>', description: 'Start auto-posting images every minute in a channel' },
      { name: 'remove <female/male/anime/random>',         description: 'Stop auto-posting a category' },
      { name: 'reset',                                     description: 'Remove all autopost channels for this server' },
    ]
  },
  tickets: {
    title: 'Ticket Commands',
    commands: [
      { name: 'ticket setup [name]',         description: 'Create or edit a ticket panel (basics + Advanced editor)' },
      { name: 'ticket panel [name]',         description: 'Publish a panel again' },
      { name: 'ticket panels',               description: 'List the ticket panels' },
      { name: 'ticket addrole <role>',       description: 'Add a support role' },
      { name: 'ticket removerole <role>',    description: 'Remove a support role' },
      { name: 'ticket variables',            description: 'List the variables for panels and messages' },
      { name: 'ticket reset <name>',         description: 'Delete a ticket panel' },
      { name: 'ticket close [reason]',       description: 'Close the current ticket' },
      { name: 'ticket open',                 description: 'Reopen a closed ticket' },
      { name: 'ticket delete',               description: 'Delete the current ticket' },
      { name: 'ticket claim',                description: 'Claim the current ticket' },
      { name: 'ticket unclaim',              description: 'Release the current ticket' },
      { name: 'ticket transfer <user>',      description: 'Hand the ticket to another staff member' },
      { name: 'ticket add <user>',           description: 'Add a user to the current ticket' },
      { name: 'ticket remove <user>',        description: 'Remove a user from the current ticket' },
      { name: 'ticket rename <name>',        description: 'Rename the current ticket channel' },
      { name: 'ticket transcript',           description: 'Get the ticket transcript' },
    ]
  },
};

/* ── categories (dropdown order) ───────────────────────────────────── */

const CATEGORIES = [
  { key: 'security', label: 'Security', icon: 'cat_security', desc: 'Protect your server from nukers, rogue bots and mass actions',
    from: [['antinuke', 'antinuke '], ['automod', 'automod '], ['logging', 'logging ']] },
  { key: 'moderation', label: 'Moderation', icon: 'cat_moderation', desc: 'Kick, ban, mute, warn and manage your members',
    from: [['moderation', ''], ['voice', 'voice ']] },
  { key: 'utility', label: 'Server Utility', icon: 'cat_utility', desc: 'Everyday tools, lists, stats, converters and more',
    from: [['general', ''], ['info', ''], ['stats', 'stats '], ['tracking', ''], ['leaderboard', 'leaderboard '], ['misc', ''], ['embed', 'embed '], ['container', 'container '], ['conversion', ''], ['todo', 'todo '], ['files', ''], ['ignore', 'ignore '], ['userprofile', 'profile '], ['botprofile', ''], ['social', ''], ['crypto', 'crypto '], ['ai', 'ai ']] },
  { key: 'community', label: 'Community', icon: 'cat_community', desc: 'Welcome, tickets, giveaways, roles and automation',
    from: [['welcome', 'welcome '], ['farewell', 'farewell '], ['boost', 'boost '], ['tickets', ''], ['giveaway', 'giveaway '], ['voicemaster', 'voicemaster '], ['reactionroles', 'reactionroles '], ['vanity', 'vanity '], ['feedback', 'feedback '], ['autoreact', 'autoreact '], ['autopost', 'autopost '], ['media', 'media '], ['pfps', 'pfp ']] },
  { key: 'fun', label: 'Fun', icon: 'cat_fun', desc: 'Games, memes, animals and roleplay',
    from: [['fun', ''], ['animals', ''], ['roleplay', '']] },
];

const PAGE_SIZE = 8;
const ID = {
  select: 'hope_help_select', prev: 'hope_help_prev', next: 'hope_help_next',
  jump: 'hope_help_jump', del: 'hope_help_del',
};

// English translator, used wherever no user is involved (and as the registry fallback).
const EN = i18n.translatorFor('en');

/** Translation key of a registry entry: help.d.<section>.<command words joined by _> */
const descKey = (regKey, rawName) => `help.d.${regKey}.${splitName(rawName).cmd.replace(/\s+/g, '_') || 'root'}`;

/** Description in the viewer's language; falls back to the registry's English text. */
const descOf = (tr, regKey, c) => {
  const key = descKey(regKey, c.name);
  return tr.lang !== 'en' && tr.has(key) ? tr(key) : c.description;
};
const catLabel = (tr, cat) => (cat.adhoc ? cat.label : tr(`help.cat.${cat.key}.label`));
const catDesc  = (tr, cat) => (cat.adhoc ? cat.desc : tr(`help.cat.${cat.key}.desc`));
const localPerm = (perm, tr) => (perm === 'Everyone' ? tr('common.everyone') : perm);

/** "kick <user> [reason]" → { cmd: 'kick', args: '<user> [reason]' } */
function splitName(full) {
  const m = full.match(/^(.*?)\s*((?:[<\[].*)?)$/);
  return { cmd: m[1].trim(), args: m[2].trim() };
}

function entriesOf(cat, tr = EN) {
  const out = [];
  for (const [regKey, prefix] of cat.from) {
    const data = registry[regKey];
    if (!data) continue;
    for (const c of data.commands) {
      const { cmd, args } = splitName(prefix + c.name);
      out.push({ cmd, args, desc: descOf(tr, regKey, c), descEn: c.description });
    }
  }
  return out;
}

/** Find a category by dropdown key, label, or legacy registry key. */
function resolveCategory(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  let cat = CATEGORIES.find(c => c.key === q || c.label.toLowerCase() === q);
  if (cat) return cat;
  cat = CATEGORIES.find(c => c.from.some(([k]) => k === q));
  if (cat) return cat;
  if (registry[q]) {
    return { key: `_${q}`, label: registry[q].title.replace(/ Commands$/, ''), desc: 'More commands', from: [[q, '']], adhoc: true };
  }
  return null;
}

/* ── builders ──────────────────────────────────────────────────────── */

/** Emoji for a category icon key — skipped until emojiSync has replaced the placeholder id. */
function iconOf(key) {
  const e = emojis[key];
  return e && !/:0>$/.test(e) ? e : undefined;
}


/** Modules inside a category: one per registry section that has commands. */
function modulesOf(cat) {
  const out = [];
  for (const [regKey, prefix] of cat.from) {
    const data = registry[regKey];
    if (!data?.commands?.length) continue;
    out.push({
      key: regKey,
      label: data.title.replace(/ Commands$/, ''),
      entries: data.commands.map(c => { const { cmd, args } = splitName(prefix + c.name); return { cmd, args, desc: c.description }; }),
    });
  }
  return out;
}

const totalCommands = () => CATEGORIES.reduce((n, c) => n + entriesOf(c).length, 0);

/** Rank-ordered search across every category. */
function searchAll(query, tr = EN) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const hits = [];
  for (const cat of CATEGORIES) {
    for (const e of entriesOf(cat, tr)) {
      const name = e.cmd.toLowerCase();
      const inDesc = e.desc.toLowerCase().includes(q) || e.descEn.toLowerCase().includes(q);
      const score = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : inDesc ? 3 : 9;
      if (score < 9) hits.push({ ...e, cat: cat.label, score });
    }
  }
  return hits.sort((a, b) => a.score - b.score);
}

function categorySelect(tr, current = null, disabled = false) {
  const options = [
    { label: tr('help.home'), value: 'home', emoji: iconOf('cat_home'), default: !current },
    ...CATEGORIES.map(c => ({ label: catLabel(tr, c), value: c.key, emoji: iconOf(c.icon), default: current?.key === c.key })),
  ];
  return ui.row(ui.select(ID.select, tr('help.placeholder'), options, { disabled }));
}

function inviteUrl(client) {
  return `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&integration_type=0&scope=bot+applications.commands`;
}

const WHITE = 0xF2F3F5; // pale sidebar of the design; user containers never use this value

/** Invite / Web link row (icons come from emojis.json when set). */
function linkRow(client, tr) {
  const links = [ui.link(tr('help.invite'), inviteUrl(client), iconOf('help_invite'))];
  const web = config.WEBSITE || config.SUPPORT_SERVER;
  if (web) links.push(ui.link(tr('help.web'), web, iconOf('help_web')));
  return ui.row(...links);
}

/** Flat command list for a category, as pages of PAGE_SIZE. */
const pagesFor = (n) => Math.max(1, Math.ceil(n / PAGE_SIZE));

const bullet = (e) => `- **${e.cmd}** - ${e.desc}`;

/** The whole menu is ONE container. */
function build({ client, state, tr, disabled = false }) {
  const box = ui.box().setAccentColor(WHITE);

  if (!state.cat && !state.search) {
    box.addTextDisplayComponents(ui.text(`# ${tr('help.hello', { name: client.user.username })}\n${tr('help.tagline')}`));
    box.addSeparatorComponents(ui.sep());
    box.addActionRowComponents(linkRow(client, tr));
    box.addTextDisplayComponents(ui.text(tr('help.selectHint')));
    box.addSeparatorComponents(ui.sep());
    box.addActionRowComponents(categorySelect(tr, null, disabled));
    return box;
  }

  let list; let desc; let title;
  if (state.search) {
    const hits = state.search.hits;
    title = tr('help.search');
    const q = state.search.query.slice(0, 40);
    desc = hits.length === 0 ? tr('help.resultsNone', { query: q })
      : hits.length === 1 ? tr('help.resultsOne', { query: q })
      : tr('help.resultsMany', { query: q, count: tr.num(hits.length) });
    state.pages = pagesFor(hits.length);
    state.page = Math.min(Math.max(state.page, 0), state.pages - 1);
    list = hits.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  } else {
    title = catLabel(tr, state.cat);
    desc = catDesc(tr, state.cat);
    const all = entriesOf(state.cat, tr);
    state.pages = pagesFor(all.length);
    state.page = Math.min(Math.max(state.page, 0), state.pages - 1);
    list = all.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  }

  box.addTextDisplayComponents(ui.text(`## ${title}\n${desc}`));
  box.addActionRowComponents(categorySelect(tr, state.search ? null : state.cat, disabled));
  box.addSeparatorComponents(ui.sep());
  box.addTextDisplayComponents(ui.text(list.length ? list.map(bullet).join('\n') : `-# ${tr('help.empty')}`));
  if (state.pages > 1) box.addTextDisplayComponents(ui.text(`-# ${tr('help.page', { page: tr.num(state.page + 1), pages: tr.num(state.pages) })}`));

  box.addActionRowComponents(ui.row(
    ui.btn(ID.prev, null, { style: 'primary', emoji: emojis.ArrowLeft, disabled: disabled || state.page === 0 }),
    ui.btn(ID.next, null, { style: 'primary', emoji: emojis.ArrowRight, disabled: disabled || state.page >= state.pages - 1 }),
    ui.btn(ID.jump, iconOf('help_jump') ? null : tr('help.jump'), { emoji: iconOf('help_jump'), disabled }),
    ui.deleteBtn(ID.del).setDisabled(disabled),
  ));
  return box;
}

/* ── session ───────────────────────────────────────────────────────── */

async function getPrefix(guildId) {
  if (!guildId) return config.PREFIX;
  try {
    const { GuildPrefix } = require('../database/schemas');
    return (await GuildPrefix.getPrefix(guildId)) || config.PREFIX;
  } catch (_) {
    return config.PREFIX;
  }
}

/**
 * Open the help menu on `start` (null/'home' = home screen, otherwise a
 * category key / label / legacy registry key).
 */
async function showHelp(ctx, start = null) {
  const client = ctx.client;
  const user = ctx.user ?? ctx.author;
  // always the viewer's own language, even when another module (e.g. ,antinuke) opens the menu
  const tr = i18n.translator(ctx, 'help');

  const state = { cat: null, page: 0, pages: 1, search: null };
  const open = (key) => {
    state.cat = key && key !== 'home' ? resolveCategory(key) : null;
    state.page = 0; state.search = null;
    if (state.cat && !entriesOf(state.cat).length) state.cat = null;
  };
  open(start);
  // a legacy registry key (sendHelp('antinuke')) lands on the page where that module starts
  if (state.cat && start) {
    let offset = 0;
    for (const [regKey] of state.cat.from) {
      if (regKey === String(start).toLowerCase()) { state.page = Math.floor(offset / PAGE_SIZE); break; }
      offset += registry[regKey]?.commands?.length || 0;
    }
  }

  const render = (disabled = false) => [build({ client, state, tr, disabled })];

  const msg = await ui.send(ctx, render());
  if (!msg || typeof msg.createMessageComponentCollector !== 'function') return msg;

  const collector = msg.createMessageComponentCollector({ filter: ui.onlyUser(user.id), time: 300000 });
  const redraw = (i) => i.update({ components: render(), flags: MessageFlags.IsComponentsV2 });

  collector.on('collect', async (i) => {
    try {
      switch (i.customId) {
        case ID.select: open(i.values[0]); return await redraw(i);
        case ID.prev: state.page = Math.max(0, state.page - 1); return await redraw(i);
        case ID.next: state.page += 1; return await redraw(i);
        case ID.jump: {
          const modalId = `${ID.jump}_${msg.id}`;
          const modal = new ModalBuilder().setCustomId(modalId).setTitle(tr('help.jumpTitle'))
            .addComponents(new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('q').setLabel(tr('help.jumpLabel'))
                .setPlaceholder(tr('help.jumpPlaceholder')).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(40),
            ));
          await i.showModal(modal);
          const sub = await i.awaitModalSubmit({
            time: 60000,
            filter: (m) => m.customId === modalId && m.user.id === user.id,
          }).catch(() => null);
          if (!sub) return;
          const q = sub.fields.getTextInputValue('q').trim();
          if (/^\d{1,3}$/.test(q) && (state.cat || state.search)) {
            state.page = Number(q) - 1;
          } else {
            state.cat = null;
            state.search = { query: q, hits: searchAll(q, tr) };
            state.page = 0;
          }
          return await sub.update({ components: render(), flags: MessageFlags.IsComponentsV2 });
        }
        case ID.del:
          collector.stop('deleted');
          await i.deferUpdate().catch(() => {});
          return await msg.delete().catch(() => {});
      }
    } catch (_) { /* interaction expired */ }
  });

  collector.on('end', async (_c, reason) => {
    if (reason === 'deleted') return;
    try { await msg.edit({ components: render(true), flags: MessageFlags.IsComponentsV2 }); } catch (_) {}
  });

  return msg;
}

/** Look up a single command by name → usage card (or null). */
function findCommand(query, prefix) {
  const q = String(query).toLowerCase().trim();
  if (!q) return null;
  const hits = [];
  for (const cat of CATEGORIES) {
    for (const e of entriesOf(cat)) {
      if (e.cmd === q || e.cmd.startsWith(q + ' ') || e.cmd.split(' ')[0] === q) hits.push(e);
    }
  }
  if (!hits.length) return null;
  const lines = hits.slice(0, 12).map(e => `- \`${prefix}${e.cmd}${e.args ? ' ' + e.args : ''}\` - ${e.desc}`);
  return ui.card({ title: q, lines });
}

/* ── command detail card (help <command>) ──────────────────────────── */

const REG_PERMS = {
  antinuke: 'Server Owner, Extra Owner, Admin',
  automod: 'Manage Server', logging: 'Manage Server', welcome: 'Manage Server', farewell: 'Manage Server',
  boost: 'Manage Server', tickets: 'Manage Server', giveaway: 'Manage Server', voicemaster: 'Administrator',
  reactionroles: 'Manage Roles', vanity: 'Manage Server', autopost: 'Manage Server', autoreact: 'Manage Server',
  embed: 'Manage Messages', container: 'Manage Messages', ignore: 'Manage Server', media: 'Manage Server',
  voice: 'Move Members', owner: 'Bot Owner',
};
const MOD_PERMS = {
  ban: 'Ban Members', unban: 'Ban Members', softban: 'Ban Members', kick: 'Kick Members',
  mute: 'Moderate Members', unmute: 'Moderate Members', timeout: 'Moderate Members', untimeout: 'Moderate Members',
  warn: 'Moderate Members', warnings: 'Moderate Members', delwarn: 'Moderate Members', clearwarns: 'Moderate Members',
  purge: 'Manage Messages', clear: 'Manage Messages', lock: 'Manage Channels', unlock: 'Manage Channels',
  hide: 'Manage Channels', unhide: 'Manage Channels', clone: 'Manage Channels', nuke: 'Manage Channels',
  lockthread: 'Manage Threads', unlockthread: 'Manage Threads', hidethread: 'Manage Threads', unhidethread: 'Manage Threads', slowmode: 'Manage Channels',
  role: 'Manage Roles', nick: 'Manage Nicknames', nickname: 'Manage Nicknames',
};

/** Every command line in the registry with its section key. */
function allEntries(tr = EN) {
  const out = [];
  for (const cat of CATEGORIES) {
    for (const [regKey, prefix] of cat.from) {
      for (const c of registry[regKey]?.commands || []) {
        const { cmd, args } = splitName(prefix + c.name);
        out.push({ cmd, args, desc: descOf(tr, regKey, c), reg: regKey });
      }
    }
  }
  return out;
}

function permsOf(e, command) {
  if (command?.ownerOnly) return 'Bot Owner';
  const dp = command?.data?.default_member_permissions;
  if (dp) {
    try {
      const { PermissionsBitField } = require('discord.js');
      const names = new PermissionsBitField(BigInt(dp)).toArray().map(n => n.replace(/([a-z])([A-Z])/g, '$1 $2'));
      if (names.length) return names.join(', ');
    } catch (_) { /* fall through */ }
  }
  if (e.reg === 'moderation') return MOD_PERMS[e.cmd.split(' ')[0]] || 'Moderate Members';
  return REG_PERMS[e.reg] || 'Everyone';
}

const EXAMPLE_ARG = {
  user: '@user', member: '@user', target: '@user', role: '@role', channel: '#channel', reason: 'reason',
  amount: '10', number: '10', count: '10', time: '10m', duration: '10m', text: 'text', message: 'message',
  emoji: ':emoji:', id: '123456789012345678', code: 'code', name: 'name', word: 'word', prefix: '!',
};
function exampleFor(base, args) {
  const req = [...String(args).matchAll(/<([^>|]+)[^>]*>/g)].map(m => m[1].trim().toLowerCase().replace(/[^a-z]/g, ''));
  const parts = req.map(r => EXAMPLE_ARG[r] || r);
  return `${base}${parts.length ? ' ' + parts.join(' ') : ''}`;
}

function aliasesOf(client, base) {
  const command = client.prefixCommands?.get(base);
  if (!command) return [];
  return [...client.prefixCommands.entries()]
    .filter(([k, v]) => v === command && k !== command.name && k !== base)
    .map(([k]) => k)
    .slice(0, 12);
}

/** Build the page list for a query, or null when nothing matches. */
function detailPages(client, query, tr = EN) {
  let q = String(query).toLowerCase().trim().replace(/\s+/g, ' ');
  if (!q) return null;
  const all = allEntries(tr);
  // resolve aliases (an → antinuke)
  const first = q.split(' ')[0];
  const viaAlias = client.prefixCommands?.get(first);
  if (viaAlias && viaAlias.name !== first && !all.some(e => e.cmd.split(' ')[0] === first)) {
    q = [viaAlias.name, ...q.split(' ').slice(1)].join(' ');
  }
  const base = q.split(' ')[0];
  const command = client.prefixCommands?.get(base);

  const exact = all.filter(e => e.cmd === q);
  const subs = all.filter(e => e.cmd.startsWith(`${base} `) && (q === base || e.cmd === q));
  const make = (e, group) => ({
    group,
    title: tr(group ? 'help.detail.group' : 'help.detail.command', { name: e.cmd }),
    desc: group ? (command?.description || e.desc) : e.desc,
    aliases: e.cmd === base ? aliasesOf(client, base) : [],
    params: group ? [] : [...String(e.args).matchAll(/[<\[][^>\]]+[>\]]/g)].map(m => m[0]),
    info: localPerm(permsOf(e, command), tr),
    syntax: group ? `${base} ${tr('help.detail.subcommand')}` : `${e.cmd}${e.args ? ' ' + e.args : ''}`,
    example: group ? `${subs[0]?.cmd || base}` : exampleFor(e.cmd, e.args),
  });

  if (exact.length && !(q === base && subs.length)) return [make(exact[0], false)];
  if (q === base && subs.length) {
    return [make({ cmd: base, args: '', desc: '', reg: subs[0].reg }, true), ...subs.map(e => make(e, false))];
  }
  if (subs.length) return subs.map(e => make(e, false));

  // a module name (help moderation): overview page, then one page per command in it
  const mod = registry[q];
  if (mod) {
    const list = all.filter(e => e.reg === q);
    if (list.length) {
      const head = {
        group: true, title: tr('help.detail.module', { name: q }), desc: tr('help.detail.moduleDesc', { title: mod.title.replace(/ Commands$/, '') }),
        aliases: [], params: [], info: tr('common.everyone'), syntax: 'help <command>', example: `help ${list[0].cmd}`,
      };
      return [head, ...list.map(e => make(e, false))];
    }
  }

  // a command typed without its group word (help rolecall → stats rolecall)
  const tail = all.filter(e => e.cmd.split(' ').includes(q));
  if (tail.length) return tail.map(e => make(e, false));

  // a real command that the help registry doesn't list
  if (command) {
    const e = { cmd: command.name, args: command.usage || '', desc: command.description || 'No description', reg: '' };
    const page = make(e, false);
    page.aliases = aliasesOf(client, command.name);
    return [page];
  }
  return null;
}

function detailEmbed(page, i, total, user, tr = EN) {
  const { EmbedBuilder } = require('discord.js');
  const code = (list) => (list.length ? list.map(a => `\`${a}\``).join(' ') : tr('common.none'));
  const lines = [
    `## ${page.title}`,
    `> ${page.desc}`,
    '',
    `### ${tr('help.detail.aliases')}`, code(page.aliases),
    `### ${tr('help.detail.parameters')}`, page.params.length ? code(page.params) : tr('common.none'),
    `### ${tr('help.detail.information')}`, page.info,
    `### ${tr('help.detail.usage')}`,
    '```\n' + tr('help.detail.syntax') + ': ' + page.syntax + (page.example && (page.group || page.params.length) ? '\n' + tr('help.detail.example') + ': ' + page.example : '') + '\n```',
  ];
  if (total > 1) lines.push(`**${tr('help.detail.pageOf', { page: i + 1, total, entries: total - 1 })}**`);
  return new EmbedBuilder()
    .setColor(0xF2F3F5)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL?.() })
    .setDescription(lines.join('\n'));
}

/** `help <command>`: embed card, paged when the command is a group. Returns false if unknown. */
async function showCommand(ctx, query) {
  const user = ctx.user ?? ctx.author;
  const tr = i18n.translator(ctx, 'help');
  const pages = detailPages(ctx.client, query, tr);
  if (!pages) return false;

  let at = 0;
  const rows = (disabled = false) => (pages.length > 1 ? [ui.row(
    ui.btn(ID.prev, null, { style: 'primary', emoji: emojis.ArrowLeft, disabled: disabled || at === 0 }),
    ui.btn(ID.next, null, { style: 'primary', emoji: emojis.ArrowRight, disabled: disabled || at >= pages.length - 1 }),
    ui.btn(ID.jump, iconOf('help_jump') ? null : tr('help.jump'), { emoji: iconOf('help_jump'), disabled }),
    ui.deleteBtn(ID.del).setDisabled(disabled),
  )] : []);
  const embed = () => detailEmbed(pages[at], at, pages.length, user, tr);

  const msg = await ui.sendEmbed(ctx, embed(), { rows: rows(), extra: { allowedMentions: { parse: [] } } });
  if (!msg || pages.length < 2 || typeof msg.createMessageComponentCollector !== 'function') return true;

  const collector = msg.createMessageComponentCollector({ filter: ui.onlyUser(user.id), time: 300000 });
  const redraw = (i) => i.update({ embeds: [embed()], components: rows() });
  collector.on('collect', async (i) => {
    try {
      if (i.customId === ID.prev) { at = Math.max(0, at - 1); return await redraw(i); }
      if (i.customId === ID.next) { at = Math.min(pages.length - 1, at + 1); return await redraw(i); }
      if (i.customId === ID.del) { collector.stop('deleted'); await i.deferUpdate().catch(() => {}); return await msg.delete().catch(() => {}); }
      if (i.customId === ID.jump) {
        const modalId = `${ID.jump}_${msg.id}`;
        await i.showModal(new ModalBuilder().setCustomId(modalId).setTitle(tr('help.jumpPageTitle'))
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('n').setLabel(tr('help.jumpPageLabel', { max: pages.length })).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3),
          )));
        const sub = await i.awaitModalSubmit({ time: 60000, filter: (m) => m.customId === modalId && m.user.id === user.id }).catch(() => null);
        if (!sub) return;
        const n = parseInt(sub.fields.getTextInputValue('n'), 10);
        if (Number.isInteger(n)) at = Math.min(Math.max(n - 1, 0), pages.length - 1);
        return await sub.update({ embeds: [embed()], components: rows() });
      }
    } catch (_) { /* expired */ }
  });
  collector.on('end', async (_c, reason) => {
    if (reason === 'deleted') return;
    try { await msg.edit({ embeds: [embed()], components: rows(true) }); } catch (_) {}
  });
  return true;
}

/** Number of distinct commands across every help category. */
function commandCount() {
  const seen = new Set();
  for (const cat of CATEGORIES) for (const e of entriesOf(cat)) seen.add(e.cmd);
  return seen.size;
}

/** Plain help: one small card with a link to the full command list. */
async function showSimpleHelp(ctx) {
  const base = (config.WEBSITE || '').replace(/\/+$/, '');
  const url = base ? `${base}/commands` : config.SUPPORT_SERVER;
  const { ContainerBuilder } = require('discord.js');
  const box = new ContainerBuilder(); // no accent colour
  box.addTextDisplayComponents(ui.text(`> Click to see all **${commandCount()}** commands.`));
  const parts = [box];
  if (url) parts.push(ui.row(ui.link('Commands', url))); // button sits outside the container
  return ui.send(ctx, parts);
}

/** Back-compat: every module calls sendHelp('<registryKey>', ctx). */
function sendHelp(key, ctx) {
  return showHelp(ctx, key);
}

module.exports = { sendHelp, showHelp, showSimpleHelp, commandCount, showCommand, findCommand, getPrefix, registry, CATEGORIES, resolveCategory };
