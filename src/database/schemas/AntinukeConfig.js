// [dev] cashholy (carti) :: database/schemas/AntinukeConfig.js

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AntinukeConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },
                enabled: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Whether antinuke is enabled' },
                logChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Channel for antinuke logs' },
                punishment: { type: DataTypes.STRING, defaultValue: 'stripall', comment: 'Punishment: stripall, kick, ban' },
                threshold: { type: DataTypes.INTEGER, defaultValue: 3, comment: 'Number of actions before triggering' },
                timeframe: { type: DataTypes.INTEGER, defaultValue: 60, comment: 'Timeframe in seconds' },
                antiBan: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor mass bans' },
                antiKick: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor mass kicks' },
                antiChannelCreate: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor channel creation' },
                antiChannelDelete: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor channel deletion' },
                antiRoleCreate: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor role creation' },
                antiRoleDelete: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor role deletion' },
                antiRoleUpdate: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor dangerous role updates' },
                antiWebhook: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor webhook creation' },
                antiBot: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Monitor unauthorized bot additions' },
                antiGuildUpdate: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Monitor server setting changes' },
                antiEmoji: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Monitor emoji creation/deletion' },
                antiChannelEdit: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Monitor channel modifications' },
            },
            {
                sequelize,
                modelName: 'AntinukeConfig',
                tableName: 'antinuke_config',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = AntinukeConfig;
