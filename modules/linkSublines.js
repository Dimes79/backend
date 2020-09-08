const { flatten, remove } = require("lodash");
const { Content, Sequelize: { Op } } = require("../models");


const link = async function link(sublineId, contents, date, lineId) {
    const pointModels = await getPointModels(contents);

    // Отвязываем весь привязанный контент
    await unlinkContents(date, lineId, sublineId);

    // Привязываем контент
    await linkContents(pointModels, sublineId);
};

async function linkContents(pointModels, sublineId) {
    // Ищем контент для привязки subline
    const models = await getModelForSubline(pointModels);

    models.forEach((model) => {
        const value = new Set([...model.sublineId, sublineId]);

        // eslint-disable-next-line no-param-reassign
        model.sublineId = Array.from(value);
    });

    // Привязываем контент
    const queue = models.reduce((acc, model) => acc.concat(model.save()), []);
    return Promise.all(queue);
}

async function unlinkContents(date, lineId, sublineId) {
    const linkedModels = await Content.findAll({
        where: {
            lineId,
            date,
            sublineId: {
                [Op.contains]: [sublineId],
            },
        },
    });

    linkedModels.forEach((model) => {
        // eslint-disable-next-line no-param-reassign
        model.sublineId = remove(model.sublineId, (value) => value !== sublineId);
    });

    const queue = linkedModels.reduce((acc, model) => acc.concat(model.save()), []);
    await Promise.all(queue);
}


function getPointModels(contents) {
    return Content.findAll({
        where: {
            id: {
                [Op.in]: contents,
            },
        },
    });
}

async function getModelForSubline(pointModels) {
    const queue = pointModels.reduce((acc, model) => acc.concat(Content.findAll({
        where: {
            [Op.or]: [
                {
                    id: model.id,
                },
                {
                    [Op.and]: [
                        {
                            lineId: model.lineId,
                        },
                        {
                            date: model.date,
                        },
                        {
                            pointId: model.pointId,
                        },
                    ],
                },
            ],
        },
    })), []);

    const result = await Promise.all(queue);
    return flatten(result);
}

module.exports = {
    link,
};
