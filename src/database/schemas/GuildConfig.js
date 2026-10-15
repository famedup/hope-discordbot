// »» engineered by cashholy (carti) ««

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class GuildConfig extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },
                autoreactEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Whether AutoReact is enabled' },
                loggingEnabled: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Master toggle for logging' },
                welcomeInOn: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Master toggle for welcome messages' },
                welcomeOutOn: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Master toggle for farewell messages' },
                aiChannelIds: { type: DataTypes.JSON, defaultValue: [], comment: 'Channels where AI is enabled' },
            },
            {
                sequelize,
                modelName: 'GuildConfig',
                tableName: 'guild_config',
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

module.exports = GuildConfig;
