/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */
// node ./schedule/start.js correctGPSJob

const moment = require("moment");
const { Content, Sequelize: {Op} } = require("../../models/");
const locker = require("../../modules/locker");

const maxDays = 3; // На сколько дней назад следим за сетами
const tmplDays = [
    {
        date: "2020-09-24",
        projectId: 2,
        lineId: 3,
    },
    {
        date: "2020-09-23",
        projectId: 6,
        lineId: 13,
    },
    {
        date: "2020-09-23",
        projectId: 7,
        lineId: 14,
    },
];

const start = async function start() {
    const isOk = await locker.lockJob("correctGPSJob");
    if (isOk) {
        for (let i = 0; i < tmplDays.length; i += 1) {
            const tmpl = tmplDays[i];
            const tmplSet = await getTmplsSet(tmpl);
            await correntPoints(tmplSet, tmpl);
        }
        await locker.unlockJob("correctGPSJob");
    }


};

async function correntPoints(tmplSet, tmpl) {
    const now = moment();
    now.subtract(maxDays, "days");
    let minDate = now.format("YYYY-MM-DD");
    if (minDate < tmpl.date) {
        minDate = tmpl.date;
    }

    for (let i = 0; i < tmplSet.length; i += 1) {
        const point = tmplSet[i];
        const where = {
            date: {
                [Op.gt]: minDate,
            },
            projectId: tmpl.projectId,
            lineId: tmpl.lineId,
            pointId: point.pointId,
            status: "ACTIVE",
            type: "PANORAMA",
        };
        await Content.update({
            gps: point.gps
        }, { where });
    }
}

async function getTmplsSet(tmpl) {
    return Content.findAll({
        where: {
            ...tmpl,
            status: "ACTIVE",
            type: "PANORAMA",
        },
    });
}

module.exports = {
    start,
};
