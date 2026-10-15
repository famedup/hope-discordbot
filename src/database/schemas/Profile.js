/** @author cashholy (carti) */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class Profile extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                userId: { type: DataTypes.STRING, allowNull: false, unique: true },
                description: { type: DataTypes.STRING(500), allowNull: true },
                social1Platform: { type: DataTypes.STRING, allowNull: true },
                social1Link: { type: DataTypes.STRING, allowNull: true },
                social2Platform: { type: DataTypes.STRING, allowNull: true },
                social2Link: { type: DataTypes.STRING, allowNull: true },
                social3Platform: { type: DataTypes.STRING, allowNull: true },
                social3Link: { type: DataTypes.STRING, allowNull: true },
                background: { type: DataTypes.STRING, allowNull: true },
            },
            {
                sequelize,
                modelName: 'Profile',
                tableName: 'profiles',
                timestamps: true,
            }
        );

        return this;
    }

    static async getDescription(userId) {
        const record = await this.findOne({ where: { userId } });
        return record?.description || null;
    }

    static async setDescription(userId, description) {
        let record = await this.findOne({ where: { userId } });
        
        if (!record) {
            record = await this.create({ userId, description });
        } else {
            record.description = description;
            await record.save();
        }
        return record;
    }

    static async getSocials(userId) {
        const record = await this.findOne({ where: { userId } });
        if (!record) return [];
        
        const socials = [];
        if (record.social1Platform && record.social1Link) {
            socials.push({ platform: record.social1Platform, link: record.social1Link });
        }
        if (record.social2Platform && record.social2Link) {
            socials.push({ platform: record.social2Platform, link: record.social2Link });
        }
        if (record.social3Platform && record.social3Link) {
            socials.push({ platform: record.social3Platform, link: record.social3Link });
        }
        return socials;
    }

    static async setSocial(userId, platform, link) {
        let record = await this.findOne({ where: { userId } });
        
        if (!record) {
            record = await this.create({ userId, social1Platform: platform, social1Link: link });
            return { success: true, slot: 1 };
        }

        if (record.social1Platform === platform) {
            record.social1Link = link;
            await record.save();
            return { success: true, slot: 1, updated: true };
        }
        if (record.social2Platform === platform) {
            record.social2Link = link;
            await record.save();
            return { success: true, slot: 2, updated: true };
        }
        if (record.social3Platform === platform) {
            record.social3Link = link;
            await record.save();
            return { success: true, slot: 3, updated: true };
        }

        if (!record.social1Platform) {
            record.social1Platform = platform;
            record.social1Link = link;
            await record.save();
            return { success: true, slot: 1 };
        }
        if (!record.social2Platform) {
            record.social2Platform = platform;
            record.social2Link = link;
            await record.save();
            return { success: true, slot: 2 };
        }
        if (!record.social3Platform) {
            record.social3Platform = platform;
            record.social3Link = link;
            await record.save();
            return { success: true, slot: 3 };
        }

        return { success: false, error: 'max_reached' };
    }

    static async getBackground(userId) {
        const record = await this.findOne({ where: { userId } });
        return record?.background || null;
    }

    static async setBackground(userId, background) {
        let record = await this.findOne({ where: { userId } });
        
        if (!record) {
            record = await this.create({ userId, background });
        } else {
            record.background = background;
            await record.save();
        }
        return record;
    }

    static async resetProfile(userId) {
        const record = await this.findOne({ where: { userId } });
        if (!record) return false;
        
        record.description = null;
        record.social1Platform = null;
        record.social1Link = null;
        record.social2Platform = null;
        record.social2Link = null;
        record.social3Platform = null;
        record.social3Link = null;
        record.background = null;
        await record.save();
        return true;
    }
}

module.exports = Profile;
