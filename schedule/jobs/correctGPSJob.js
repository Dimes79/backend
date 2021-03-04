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
    // {
    //     date: "2020-09-23",
    //     projectId: 6,
    //     lineId: 13,
    // },
    {
        date: "2020-09-23",
        projectId: 7,
        lineId: 14,
    },
    {
        date: "2021-02-17",
        projectId: 4,
        lineId: 7,
    },
    {
        date: "2021-02-17",
        projectId: 4,
        lineId: 11,
    },

    {
        date: "2021-02-21",
        projectId: 32,
        lineId: 107,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 103,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 104,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 105,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 106,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 108,
    },
    {
        date: "2021-02-27",
        projectId: 32,
        lineId: 110,
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
