// node ./tools/repairAeroGps.js

/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */

const { Content, Sequelize } = require("../models/");

const { Op } = Sequelize;

const gps = [
    [59.5687, 28.243879],
    [59.5687, 28.242210],
    [59.5687, 28.240319],
    [59.5687, 28.238757],
    [59.5687, 28.237357],
    [59.5687, 28.236199],
];

const dateFrom = "2018-11-12";
const dateTo = "2018-12-04";
const projectId = 1;
const lineId = 1;


(async function start() {
    try {
        await main();
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());

async function main() {
    const dates = await getDates();
    const queue = dates.reduce((acc, date) => acc.concat(prcVideos(date)), []);
    return Promise.all(queue);
}

async function prcVideos(date) {
    const list = await Content.findAll({
        where: {
            status: "ACTIVE",
            type: "AERIAL",
            projectId,
            lineId,
            date,
        },
        order: [["id", "ASC"]],
    });

    for (let i = 0; i < list.length; i += 1) {
        if (i === gps.length) {
            break;
        }

        const content = list[i];
        content.gps = {
            lat: gps[i][0],
            long: gps[i][1],
        };
        await content.save();
    }
}

async function getDates() {
    const list = await Content.findAll({
        attributes: ["date"],
        group: ["date"],
        where: {
            status: "ACTIVE",
            type: "AERIAL",
            projectId,
            lineId,
            date: {
                [Op.between]: [dateFrom, dateTo],
            },
        },
    });

    return list.reduce((acc, content) => acc.concat(content.date), []);
}
