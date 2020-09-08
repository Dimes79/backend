const { remove } = require("lodash");
const { Content, Sequelize: { Op } } = require("../models");


const link = async function link(aeroVideoPointId, contents, date, lineId) {
    const contentsModels = await getContentsModels(contents);

    // Отвязываем весь привязанный контент
    await unlinkContents(date, lineId, aeroVideoPointId);

    // Привязываем контент
    await linkContents(contentsModels, aeroVideoPointId);
};

async function linkContents(models, aeroVideoPointId) {
    models.forEach((model) => {
        const value = new Set([...model.aeroVideoPointId, aeroVideoPointId]);

        // eslint-disable-next-line no-param-reassign
        model.aeroVideoPointId = Array.from(value);
    });

    // Привязываем контент
    const queue = models.reduce((acc, model) => acc.concat(model.save()), []);
    return Promise.all(queue);
}

async function unlinkContents(date, lineId, aeroVideoPointId) {
    const linkedModels = await Content.findAll({
        where: {
            lineId,
            date,
            aeroVideoPointId: {
                [Op.contains]: [aeroVideoPointId],
            },
        },
    });

    linkedModels.forEach((model) => {
        // eslint-disable-next-line no-param-reassign
        model.aeroVideoPointId = remove(model.aeroVideoPointId, (value) => value !== aeroVideoPointId);
    });

    const queue = linkedModels.reduce((acc, model) => acc.concat(model.save()), []);
    await Promise.all(queue);
}


function getContentsModels(contents) {
    return Content.findAll({
        where: {
            id: {
                [Op.in]: contents,
            },
        },
    });
}

module.exports = {
    link,
};
