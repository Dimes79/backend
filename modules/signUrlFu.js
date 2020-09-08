const uuidv4 = require("uuid/v4");
const moment = require("moment");
const { ContentKey, Sequelize: { Op } } = require("../models");

const DEF_DAYS_LIFE = 7; // Общее время ссылки
const DEF_DAYS_BEFORE_EXPIRED = 2; // За сколько до окончания жизни выдавать новую ссылку

async function singPath(userId, path) {
    const signKey = await getSignKey(userId, path);
    return crUrl(path, signKey);
}

async function singPathForce(userId, path) {
    const model = await crSign(userId, path);
    return crUrl(path, model.key);
}

async function getSignKey(userId, path, days = DEF_DAYS_LIFE) {
    const expireAt = moment().add(DEF_DAYS_BEFORE_EXPIRED, "days");
    let model = await ContentKey.findOne({
        where: {
            userId,
            path,
            [Op.or]: [
                {
                    expireAt: { [Op.is]: null },
                },
                {
                    expireAt: { [Op.gte]: expireAt },
                },
            ],
        },
    });

    if (!model) {
        model = await crSign(userId, path, days);
    }

    return model.key;
}

async function isSigned(key, path) {
    const model = await ContentKey.findOne({
        where: {
            path,
            key,
            [Op.or]: [
                {
                    expireAt: { [Op.is]: null },
                },
                {
                    expireAt: { [Op.gte]: new Date() },
                },
            ],
        },
    });

    return !!(model);
}

async function crSign(userId, path, days = DEF_DAYS_LIFE) {
    const expireAt = moment().add(days, "days");
    const key = uuidv4();

    const model = new ContentKey({
        userId,
        path,
        expireAt,
        key,
    });

    await model.save();

    return model;
}

function crUrl(path, signKey) {
    return `${path}?sk=${signKey}`;
}

module.exports = {
    singPath,
    singPathForce,
    isSigned,
};
