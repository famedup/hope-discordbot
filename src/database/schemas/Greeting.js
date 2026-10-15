/* ⌁ crafted by cashholy (carti) ⌁ */

// Welcome / farewell / boost messages (one row per kind per server)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Greeting extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                kind: { type: DataTypes.STRING(12), allowNull: false },          // welcome | farewell | boost
                channelId: { type: DataTypes.STRING, allowNull: true },
                enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
                message: { type: DataTypes.TEXT, allowNull: true },              // text, may hold {embed:name} / {container:name}
                autoDelete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },   // seconds, 0 = keep
            },
            {
                sequelize,
                modelName: 'Greeting',
                tableName: 'greetings',
                timestamps: true,
                indexes: [{ unique: true, fields: ['guildId', 'kind'], name: 'greetings_guild_kind' }],
            }
        );
        return this;
    }
}

module.exports = Greeting;
