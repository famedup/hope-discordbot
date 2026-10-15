/*
 * Developed by cashholy (carti)
 * File: database/schemas/GuildPrefix.js
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

const prefixCache = new Map();
const CACHE_TTL = 30000;

class GuildPrefix extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
                prefix: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'GuildPrefix',
                tableName: 'guild_prefix',
                timestamps: true,
            }
        );

        return this;
    }

    static async getPrefix(guildId) {
        const cached = prefixCache.get(guildId);
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;

        const record = await this.findOne({ where: { guildId } });
        const val = record ? record.prefix : null;
        prefixCache.set(guildId, { val, ts: Date.now() });
        return val;
    }

    static async setPrefix(guildId, prefix) {
        const [record, created] = await this.findOrCreate({
            where: { guildId },
            defaults: { prefix }
        });

        if (!created) {
            record.prefix = prefix;
            await record.save();
        }

        // Immediately update cache so new prefix works right away
        prefixCache.set(guildId, { val: prefix, ts: Date.now() });

        return record;
    }

    static clearCache(guildId) {
        if (guildId) prefixCache.delete(guildId);
        else prefixCache.clear();
    }
}

module.exports = GuildPrefix;
