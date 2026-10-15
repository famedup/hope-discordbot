/*! © 2026 cashholy (carti) !*/

/**
 * Database Models Index
 * Initializes all models and sets up associations
 */

const sequelize = require('../sequelize');
const NoPrefix = require('./NoPrefix');
const AFK = require('./AFK');
const J2CConfig = require('./J2CConfig');
const TempChannel = require('./TempChannel');
const Todo = require('./Todo');
const GuildPrefix = require('./GuildPrefix');
const Blacklist = require('./Blacklist');
const LoggingConfig = require('./LoggingConfig');
const WelcomeConfig = require('./WelcomeConfig');
const FarewellConfig = require('./FarewellConfig');
const Profile = require('./Profile');
const AutoReact = require('./AutoReact');
const AntinukeConfig = require('./AntinukeConfig');
const GuardSettings = require('./GuardSettings');
const UserLanguage = require('./UserLanguage');
const TicketPanel = require('./TicketPanel');
const AntinukeWhitelist = require('./AntinukeWhitelist');
const AutomodConfig = require('./AutomodConfig');
const AutomodWhitelist = require('./AutomodWhitelist');
const GuildConfig = require('./GuildConfig');
const ModLog = require('./ModLog');
const Favorite = require('./Favorite');
const Playlist = require('./Playlist');
const PlaylistTrack = require('./PlaylistTrack');
const Giveaway = require('./Giveaway');
const GiveawayEntry = require('./GiveawayEntry');
const ReactionRoles = require('./ReactionRoles');
const TicketConfig = require('./TicketConfig');
const TicketCategory = require('./TicketCategory');
const Ticket = require('./Ticket');
const BotCustomization = require('./BotCustomization');
const AutoRole = require('./AutoRole');
const Embed = require('./Embed');
const Container = require('./Container');
const Warn = require('./Warn');
const Greeting = require('./Greeting');


// Initialize all models
NoPrefix.init(sequelize);
AFK.init(sequelize);
J2CConfig.init(sequelize);
TempChannel.init(sequelize);
Todo.init(sequelize);
GuildPrefix.init(sequelize);
Blacklist.init(sequelize);
LoggingConfig.init(sequelize);
WelcomeConfig.init(sequelize);
FarewellConfig.init(sequelize);
Profile.init(sequelize);
AutoReact.init(sequelize);
AntinukeConfig.init(sequelize);
GuardSettings.init(sequelize);
UserLanguage.init(sequelize);
TicketPanel.init(sequelize);
AntinukeWhitelist.init(sequelize);
AutomodConfig.init(sequelize);
AutomodWhitelist.init(sequelize);
GuildConfig.init(sequelize);
ModLog.init(sequelize);
Favorite.init(sequelize);
Playlist.init(sequelize);
PlaylistTrack.init(sequelize);
Giveaway.init(sequelize);
GiveawayEntry.init(sequelize);
TicketConfig.init(sequelize);
TicketCategory.init(sequelize);
Ticket.init(sequelize);
BotCustomization.init(sequelize);
AutoRole.init(sequelize);
Embed.init(sequelize);
Container.init(sequelize);
Warn.init(sequelize);
Greeting.init(sequelize);

const models = {
    NoPrefix,
    AFK,
    J2CConfig,
    TempChannel,
    Todo,
    GuildPrefix,
    Blacklist,
    LoggingConfig,
    WelcomeConfig,
    FarewellConfig,
    Profile,
    AutoReact,
    AntinukeConfig,
    GuardSettings,
    UserLanguage,
    TicketPanel,
    AntinukeWhitelist,
    AutomodConfig,
    AutomodWhitelist,
    GuildConfig,
    ModLog,
    Favorite,
    Playlist,
    PlaylistTrack,
    Giveaway,
    GiveawayEntry,
    ReactionRoles,
    TicketConfig,
    TicketCategory,
    Ticket,
    BotCustomization,
    AutoRole,
    Embed,
    Container,
    Warn,
    Greeting,
    sequelize
};

Object.values(models).forEach(model => {
    if (model.associate && typeof model.associate === 'function') {
        model.associate(models);
    }
});

async function safeAddIndex(qi, table, fields, options = {}) {
    try {
        await qi.addIndex(table, fields, options);
    } catch (e) {
        const msg = e.message || '';
        if (msg.includes('already exists') || e.original?.code === '42P07' || e.original?.code === '42701') return;
        throw e;
    }
}

const dbReady = sequelize.sync()
    .then(async () => {
        const qi = sequelize.getQueryInterface();

        // tickets v2: add the new nullable columns to an existing table
        const ticketCols = await qi.describeTable('tickets').catch(() => null);
        if (ticketCols) {
            const { DataTypes } = require('sequelize');
            const add = {
                panelId: DataTypes.INTEGER, caseNumber: DataTypes.INTEGER, reason: DataTypes.TEXT, rating: DataTypes.INTEGER,
                lastActivityAt: DataTypes.DATE, warnedAt: DataTypes.DATE, warnMessageId: DataTypes.STRING, deleteAt: DataTypes.DATE,
            };
            for (const [col, type] of Object.entries(add)) {
                if (!ticketCols[col]) await qi.addColumn('tickets', col, { type, allowNull: true });
            }
        }

        const ticketConfigCols = await qi.describeTable('ticket_config').catch(() => null);
        if (ticketConfigCols && !ticketConfigCols.additionalRoleIds) {
            await qi.addColumn('ticket_config', 'additionalRoleIds', {
                type: require('sequelize').DataTypes.TEXT,
                allowNull: true,
                defaultValue: '[]'
            });
        }
        if (ticketConfigCols && !ticketConfigCols.panelMessageId) {
            await qi.addColumn('ticket_config', 'panelMessageId', {
                type: require('sequelize').DataTypes.STRING,
                allowNull: true
            });
        }

        await Promise.all([
            safeAddIndex(qi, 'giveaways',       ['ended', 'endTime'],          { name: 'giveaways_ended_endtime' }),
            safeAddIndex(qi, 'giveaways',       ['guildId'],                   { name: 'giveaways_guild_id' }),
            safeAddIndex(qi, 'giveaway_entries',['giveawayId'],                { name: 'giveaway_entries_giveaway_id' }),
            safeAddIndex(qi, 'giveaway_entries',['giveawayId', 'userId'],      { name: 'giveaway_entries_giveaway_user', unique: true }),
            safeAddIndex(qi, 'auto_react',      ['guildId'],                   { name: 'auto_react_guild_id' }),
            safeAddIndex(qi, 'ticket_categories',['guildId'],                  { name: 'ticket_categories_guild_id' }),
            safeAddIndex(qi, 'ticket_categories',['guildId', 'categoryName'],  { name: 'ticket_categories_guild_category' }),
        ]);

        return true;
    })
    .catch((err) => {
        console.error('Database sync error:', err.message);
        throw err;
    });

models.dbReady = dbReady;

module.exports = models;
