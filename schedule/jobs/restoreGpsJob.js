// node ./schedule/start.js restoreGpsJob

const moment = require("moment");
const { Content, Sequelize } = require("../../models/");
const locker = require("../../modules/locker");
const { restoreGpsPrcSet, crPoints } = require("../../modules/restoreGps");

const { Op } = Sequelize;

const maxDays = 4; // На сколько дней назад следим за сетами

const start = async function start() {
    const isOk = await locker.lockJob("restoreGpsJob");
    if (isOk) {
        const projectsSets = await getProjectsSets();

        // Востанавливаем GPS
        let queue = projectsSets.reduce(
            (acc, row) => acc.concat(restoreGpsPrcSet(row.projectId, row.lineId, row.date)), [],
        );
        await Promise.all(queue);

        // Формируем GPS точки
        queue = projectsSets.reduce(
            (acc, row) => acc.concat(crPoints(row.projectId, row.lineId, row.date)), [],
        );
        await Promise.all(queue);

        await locker.unlockJob("restoreGpsJob");
    }
};

async function getProjectsSets() {
    const now = moment();
    now.subtract(maxDays, "days");
    const minDate = now.format("YYYY-MM-DD");

    return Content.findAll({
        attributes: ["projectId", "lineId", "date"],
        group: ["projectId", "lineId", "date"],
        where: {
            status: "ACTIVE",
            type: "PANORAMA",
            date: {
                [Op.gte]: minDate,
            },
        },
    });
}

module.exports = {
    start,
};
