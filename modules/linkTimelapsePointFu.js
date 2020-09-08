const { remove } = require("lodash");
const { Content, Sequelize: { Op } } = require("../models");


const link = async function link(timelapsePointId, contents, date, lineId) {
    const contentsModels = await getContentsModels(contents);

    // Отвязываем весь привязанный контент
    await unlinkContents(date, lineId, timelapsePointId);

    // Привязываем контент
    await linkContents(contentsModels, timelapsePointId);
};

async function linkContents(models, timelapsePointId) {
    models.forEach((model) => {
        const value = new Set([...model.timelapsePointId, timelapsePointId]);

        // eslint-disable-next-line no-param-reassign
        model.timelapsePointId = Array.from(value);
    });

    // Привязываем контент
    const queue = models.reduce((acc, model) => acc.concat(model.save()), []);
    return Promise.all(queue);
}

async function unlinkContents(date, lineId, timelapsePointId) {
    const linkedModels = await Content.findAll({
        where: {
            lineId,
            date,
            timelapsePointId: {
                [Op.contains]: [timelapsePointId],
            },
        },
    });

    linkedModels.forEach((model) => {
        // eslint-disable-next-line no-param-reassign
        model.timelapsePointId = remove(model.timelapsePointId, (value) => value !== timelapsePointId);
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
