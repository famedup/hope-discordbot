/* ---
   author : cashholy (carti)
   module : embedVars
   --- */

// Embed variables: short {tags} that get replaced when an embed is shown.
//   {user} {user.name} {server} {server.members} ...

const ts = (d, f) => (d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:${f}>` : '');

function ordinal(n) {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

function topRole(member) {
    const role = member?.roles?.highest;
    return role && role.id !== member.guild.id ? `<@&${role.id}>` : 'none';
}

// name -> [description, resolver(ctx)]
const VARIABLES = {
    // user
    'user':            ['Mentions the user',               c => (c.user ? `<@${c.user.id}>` : '')],
    'user.name':       ['Username',                        c => c.user?.username ?? ''],
    'user.nick':       ['Server nickname / display name',  c => c.member?.displayName ?? c.user?.globalName ?? c.user?.username ?? ''],
    'user.mention':    ['Mentions the user (same as {user})', c => (c.user ? `<@${c.user.id}>` : '')],
    'user.id':         ['User ID',                         c => c.user?.id ?? ''],
    'user.avatar':     ['Avatar URL',                      c => (c.member ?? c.user)?.displayAvatarURL({ size: 512 }) ?? ''],
    'user.role':       ['Highest role',                    c => topRole(c.member)],
    'user.created':    ['Account created (date)',          c => ts(c.user?.createdAt, 'D')],
    'user.created.ago':['Account created (relative)',      c => ts(c.user?.createdAt, 'R')],
    'user.joined':     ['Joined server (date)',            c => ts(c.member?.joinedAt, 'D')],
    'user.joined.ago': ['Joined server (relative)',        c => ts(c.member?.joinedAt, 'R')],

    'user.boosted':    ['Boosting since (date)',           c => ts(c.member?.premiumSince, 'D')],
    'user.boosted.ago':['Boosting since (relative)',       c => ts(c.member?.premiumSince, 'R')],

    // server
    'server':          ['Server name',                     c => c.guild?.name ?? ''],
    'server.id':       ['Server ID',                       c => c.guild?.id ?? ''],
    'server.icon':     ['Server icon URL',                 c => c.guild?.iconURL({ size: 512 }) ?? ''],
    'server.banner':   ['Server banner URL',               c => c.guild?.bannerURL({ size: 1024 }) ?? ''],
    'server.owner':    ['Mentions the server owner',       c => (c.guild ? `<@${c.guild.ownerId}>` : '')],
    'server.members':  ['Member count',                    c => String(c.guild?.memberCount ?? '')],
    'server.members.ord': ['Member count (1st, 2nd...)',   c => (c.guild ? ordinal(c.guild.memberCount) : '')],
    'server.boosts':   ['Boost count',                     c => String(c.guild?.premiumSubscriptionCount ?? 0)],
    'server.tier':     ['Boost tier',                      c => String(c.guild?.premiumTier ?? 0)],
    'server.channels': ['Channel count',                   c => String(c.guild?.channels?.cache?.size ?? 0)],
    'server.roles':    ['Role count',                      c => String(c.guild?.roles?.cache?.size ?? 0)],
    'server.emojis':   ['Emoji count',                     c => String(c.guild?.emojis?.cache?.size ?? 0)],
    'server.created':  ['Server created (date)',           c => ts(c.guild?.createdAt, 'D')],
    'server.created.ago': ['Server created (relative)',    c => ts(c.guild?.createdAt, 'R')],

    // boosts
    'boost.count':     ['Server boost count',              c => String(c.guild?.premiumSubscriptionCount ?? 0)],
    'boost.tier':      ['Server boost tier',               c => String(c.guild?.premiumTier ?? 0)],

    // channel
    'channel':         ['Mentions the channel',            c => (c.channel ? `<#${c.channel.id}>` : '')],
    'channel.name':    ['Channel name',                    c => c.channel?.name ?? ''],
    'channel.id':      ['Channel ID',                      c => c.channel?.id ?? ''],

    // time
    'date':            ['Today\'s date',                   () => ts(Date.now(), 'D')],
    'time':            ['Current time',                    () => ts(Date.now(), 't')],
    'timestamp':       ['Unix timestamp (seconds)',        () => String(Math.floor(Date.now() / 1000))],
};

const GROUPS = [
    ['User', k => k.startsWith('user') && !k.startsWith('user.boost')],
    ['Server', k => k.startsWith('server')],
    ['Boost', k => k.startsWith('boost') || k.startsWith('user.boost')],
    ['Channel', k => k.startsWith('channel')],
    ['Time', k => ['date', 'time', 'timestamp'].includes(k)],
];

const TAG = /\{([a-z]+(?:\.[a-z]+)*)\}/gi;

/** Replace every known {variable} in text. Unknown tags are left as-is. */
function applyVars(text, ctx = {}) {
    if (!text || typeof text !== 'string') return text ?? '';
    return text.replace(TAG, (match, key) => {
        // callers (tickets) can pass extra values: applyVars(text, { ...ctx, vars: { 'ticket.id': '0001' } })
        if (ctx.vars && Object.prototype.hasOwnProperty.call(ctx.vars, key.toLowerCase())) return String(ctx.vars[key.toLowerCase()] ?? '');
        const entry = VARIABLES[key.toLowerCase()];
        if (!entry) return match;
        try { return entry[1](ctx) ?? ''; } catch (_) { return ''; }
    });
}

/** Build the variable context from an interaction or a join/leave member. */
function ctxFromInteraction(interaction, channel = interaction.channel) {
    return {
        guild: interaction.guild,
        user: interaction.user,
        member: interaction.member,
        channel,
    };
}

function ctxFromMember(member, channel = null) {
    return { guild: member.guild, user: member.user, member, channel };
}

/** Grouped list used by /embed variables and the builder. */
function variableGroups() {
    return GROUPS.map(([title, test]) => ({
        title,
        items: Object.entries(VARIABLES)
            .filter(([k]) => test(k))
            .map(([k, [desc]]) => ({ tag: `{${k}}`, desc })),
    }));
}

module.exports = { VARIABLES, applyVars, ctxFromInteraction, ctxFromMember, variableGroups };
