/* ---
   author : cashholy (carti)
   module : AutoRole
   --- */

// hope — roles given automatically to new humans / bots

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

const cache = new Map();

class AutoRole extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
                humans: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
                bots: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
            },
            { sequelize, modelName: 'AutoRole', tableName: 'autoroles', timestamps: true }
        );
        return this;
    }

    static async read(guildId) {
        if (cache.has(guildId)) return cache.get(guildId);
        const row = await this.findOne({ where: { guildId } });
        const val = { humans: row?.humans ?? [], bots: row?.bots ?? [] };
        cache.set(guildId, val);
        return val;
    }

    static async write(guildId, patch) {
        const [row] = await this.findOrCreate({ where: { guildId }, defaults: { guildId } });
        Object.assign(row, patch);
        await row.save();
        cache.delete(guildId);
        return this.read(guildId);
    }

    static async clear(guildId) {
        await this.destroy({ where: { guildId } });
        cache.delete(guildId);
    }
}

module.exports = AutoRole;
