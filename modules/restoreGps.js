/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */

const moment = require("moment");
const { Content, Sequelize } = require("../models/");

const { Op } = Sequelize;

const maxInterval = 1800; // Время искомого объекта не может отстоять во времени больше чем на эту величину

const restoreGpsPrcSet = async function restoreGpsPrcSet(projectId, lineId, date) {
    const where = {
        projectId,
        lineId,
        date,
    };

    const gps = await getGpsFromContent(where);
    const contents = await getContents(where);
    await setGps(gps, contents);
};

const crPoints = async function crPoints(projectId, lineId, date) {
    if (Number.parseInt(projectId, 10) !== 1) {
        return;
    }

    const where = {
        projectId,
        lineId,
        date,
    };
    const panarams = await getGpsFromContent(where, true);
    const types = ["IMAGE", "VIDEO"];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        await crPointsForSet(projectId, lineId, date, type, panarams);
    }
};

async function crPointsForSet(projectId, lineId, date, type, panarams) {
    const where = {
        type,
        projectId,
        lineId,
        date,
    };
    const contents = await getContents(where, false);
    const lastPoint = panarams.length - 1;
    const contentPerPoint = Math.floor(contents.length / panarams.length);
    for (let point = 0; point <= lastPoint; point += 1) {
        const panarama = panarams[point];
        const model = await Content.findByPk(panarama.id);
        model.pointId = point;
        await model.save();

        const totalPerPoint = (point !== lastPoint) ? contentPerPoint : contents.length;
        await linkContentToPoint(point, panarama, contents, totalPerPoint);
    }
}

async function linkContentToPoint(point, panarama, contents, totalPerPoint) {
    for (let i = 0; i < totalPerPoint; i += 1) {
        const elm = contents.shift();
        if (!elm) {
            continue;
        }

        const model = await Content.findByPk(elm.id);
        model.pointId = point;
        model.gps = panarama.gps;
        await model.save();
    }
}

async function getGpsFromContent(where, linkToPanaramaOnly = false) {
    const extWhere = {};
    if (linkToPanaramaOnly) {
        extWhere.type = "PANORAMA";
    }
    const list = await Content.findAll({
        where: {
            status: "ACTIVE",
            gps: {
                [Op.ne]: null,
            },
            contentCreateDate: {
                [Op.ne]: null,
            },
            ...where,
            ...extWhere,
        },
        order: [["contentCreateDate", "ASC"]],
    });

    const out = [];
    list.forEach((elm) => {
        const m = moment(elm.contentCreateDate);
        const time = m.unix();
        out.push({
            time,
            gps: elm.gps,
            id: elm.id,
        });
    });

    return out.sort((a, b) => {
        if (a.time < b.time) {
            return -1;
        }
        if (a.time > b.time) {
            return 1;
        }
        return 0;
    });
}

async function getContents(where, withGpsNull = true) {
    const extWhere = {};
    if (withGpsNull) {
        extWhere.gps = {
            [Op.eq]: null,
        };
    }
    const list = await Content.findAll({
        where: {
            status: {
                [Op.or]: ["ACTIVE", "WAITING"],
            },
            contentCreateDate: {
                [Op.ne]: null,
            },
            ...where,
            ...extWhere,
        },
        order: [["contentCreateDate", "ASC"]],
    });

    const out = [];
    list.forEach((elm) => {
        const m = moment(elm.contentCreateDate);
        const time = m.unix();
        out.push({
            time,
            id: elm.id,
        });
    });

    return out;
}

async function setGps(listFrom, listTo) {
    for (let i = 0; i < listTo.length; i += 1) {
        const elm = listTo[i];
        const gps = getGpsByTime(elm.time, listFrom);
        if (!gps) {
            continue;
        }

        const model = await Content.findByPk(elm.id);
        model.gps = gps;
        await model.save();
    }
}

function getGpsByTime(searchTime, list) {
    const position = getPositionyTime(searchTime, list);
    if (position === null) {
        return null;
    }
    const elm = list[position];
    return elm.gps;
}

function getPositionyTime(searchTime, list) {
    let position = null;

    if (!searchTime) {
        return position;
    }

    let minTime = 0;
    for (let i = 0; i < list.length; i += 1) {
        const elm = list[i];
        if (elm.time > (searchTime + maxInterval)) {
            break;
        }

        if (elm.time < (searchTime - maxInterval)) {
            continue;
        }

        if (!minTime || Math.abs(elm.time - searchTime) < minTime) {
            minTime = Math.abs(elm.time - searchTime);
            position = i;
        }
    }

    return position;
}


module.exports = {
    restoreGpsPrcSet,
    crPoints,
};
