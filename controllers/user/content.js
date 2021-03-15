const path = require("path");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const archiver = require("archiver");
const uuidv4 = require("uuid/v4");
const { tmpDir } = require("../../modules/tmpDir");
const companyFu = require("../../modules/companyFu");
const { singPath } = require("../../modules/signUrlFu");
const { Content, Line, Sequelize: { Op } } = require("../../models");

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const { lineId } = req.params;
    const { sublineId, dateBefore, dateTo } = req.query;
    let { dateFrom } = req.query;

    const where = {
        status: "ACTIVE",
        lineId,
        type: req.params.type.toUpperCase(),
    };

    if (sublineId) {
        where.sublineId = {
            [Op.contains]: [sublineId],
        };
    }

    if (dateBefore) {
        dateFrom = await Content.max("date", {
            where: {
                ...where,
                date: { [Op.lte]: dateBefore },
            },
        }) || dateBefore;
    } else if (!dateFrom) {
        dateFrom = await Content.max("date", { where });
    }

    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const projectId = await getProjectId(lineId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const { rows, count } = await Content.findAndCountAll({
            where,
            order: [["pointId", "ASC"], ["id", "ASC"]],
            offset: (page - 1) * limit,
            limit,
        });
        const rowsSigned = await singRows(req.user.id, rows);
        res.sendData(rowsSigned, count, { date: dateFrom });
    } catch (e) {
        next(e);
    }
};

const getContentById = async function getContentById(req, res) {
    const { id, type, date } = req.query;

    try {
        const content = await Content.findOne({
            where: {
                id,
                date,
                type: type.toUpperCase(),
            },
        });
        if (!content) {
            res.status(500)
                .send(null);
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(content.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.json({
            success: true,
            payload: content,
        });
    } catch (e) {
        res.status(500)
            .send(null);
    }
};

const getTimelapseById = async function getTimelapseById(req, res) {
    const { id } = req.query;

    try {
        const content = await Content.findOne({
            where: {
                id,
            },
        });
        if (!content) {
            res.status(500)
                .send(null);
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(content.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.json({
            success: true,
            payload: content,
        });
    } catch (e) {
        res.status(500)
            .send(null);
    }
};

const getCalendar = async function getCalendar(req, res, next) {
    const { projectId } = req.params;
    const { sublineId, dateFrom } = req.query;

    const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
    if (!isCompanyPermit) {
        return;
    }

    const where = {
        status: "ACTIVE",
        projectId,
        lineId: req.params.lineId,
    };

    if (sublineId) {
        where.sublineId = {
            [Op.contains]: [sublineId],
        };
    }

    const dateTo = req.query.dateTo || dateFrom;
    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const rows = await Content.findAll({
            attributes: ["date"],
            where,
            group: "date",
            order: [["date", "DESC"]],
        });
        const dates = rows.reduce((acc, row) => acc.concat(row.date), []);
        res.sendData(dates);
    } catch (e) {
        next(e);
    }
};

const getCalendarByLineId = async function getCalendarByLineId(req, res, next) {
    const { lineId } = req.params;
    const { sublineId, dateFrom } = req.query;

    const where = {
        status: "ACTIVE",
        lineId,
    };

    if (sublineId) {
        where.sublineId = sublineId;
    }

    const dateTo = req.query.dateTo || dateFrom;
    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const projectId = await getProjectId(lineId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const rows = await Content.findAll({
            attributes: ["date"],
            where,
            group: "date",
            order: [["date", "DESC"]],
        });
        const dates = rows.reduce((acc, row) => acc.concat(row.date), []);
        res.sendData(dates);
    } catch (e) {
        next(e);
    }
};

const getListByPoint = async function getListByPoint(req, res, next) {
    const { lineId } = req.params;
    const { date } = req.query;
    const pointId = req.query.pointId || 0;

    const where = {
        status: "ACTIVE",
        lineId,
        date,
        type: "PANORAMA",
    };

    try {
        const projectId = await getProjectId(lineId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const rowsPrev = await Content.findAll({
            where: { ...where, pointId: { [Op.lte]: pointId } },
            order: [["pointId", "desc"]],
            limit: 3,
        });
        const rowsNext = await Content.findAll({
            where: { ...where, pointId: { [Op.gt]: pointId } },
            order: [["pointId", "asc"]],
            limit: 2,
        });
        const rows = rowsPrev.reverse().concat(rowsNext);

        const queue = rows.reduce((acc, row) => acc.concat(appendContents(row)), []);
        const data = await Promise.all(queue);

        res.sendData(data);
    } catch (e) {
        next(e);
    }
};

async function appendContents(data) {
    const where = {
        status: "ACTIVE",
        lineId: data.lineId,
        date: data.date,
        type: { [Op.ne]: "PANORAMA" },
        pointId: data.pointId,
    };

    // eslint-disable-next-line no-param-reassign
    data.contents = await Content.findAll({
        where,
    });

    return data;
}

async function getProjectId(lineId) {
    const line = await Line.findByPk(lineId);
    if (!line) {
        return 0;
    }

    return line.projectId;
}

async function singRows(userId, rows) {
    const queue = rows.reduce((acc, content) => acc.concat(singContent(userId, content)), []);
    return Promise.all(queue);
}

async function singContent(userId, content) {
    const { src } = content;

    const keys = Object.keys(src);
    const queue = keys.reduce((acc, key) => acc.concat(singPath(userId, src[key])), []);
    const signedUrls = await Promise.all(queue);

    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        src[key] = signedUrls[i];
    }
    return content;
}

async function getArchive(req, res, next) {
    const { lineId } = req.params;
    const {
        dateFrom, dateTo, pointId, fov, yaw, pitch, width, height,
    } = req.query;

    try {
        const projectId = await getProjectId(lineId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const line = await Line.findByPk(lineId);
        const contents = await Content.findAll({
            where: {
                lineId,
                pointId,
                date: {
                    [Op.between]: [dateFrom, dateTo],
                },
            },
        });


        const files = [];
        contents.forEach((elm) => {
            files.push({
                date: elm.date,
                file: path.join(path.resolve("."), elm.src.src),
                resFile: path.join(tmpDir, `${uuidv4()}.png`),
            });
        });

        await splitPanoramas(files, fov, yaw, pitch, width, height);

        res.attachment(`${line.name}_${convertDate(dateFrom)}-${convertDate(dateTo)}.zip`);

        // const zipFile = path.join(tmpDir, `${uuidv4()}.zip`);
        const archive = archiver("zip", {
            zlib: { level: 9 },
        });

        archive.pipe(res);

        archive.on("end", () => {
            res.end();
        });

        archive.on("error", (err) => {
            next(err);
        });

        files.forEach((elm) => {
            archive.append(fs.createReadStream(elm.resFile), { name: `${convertDate(elm.date)}.png` });
        });

        archive.finalize();
    } catch (e) {
        next(e);
    }
}

function splitPanoramas(files, fov, yaw, pitch, width, height) {
    let queue = Promise.resolve();
    files.forEach((elm) => {
        queue = queue.then(async () => {
            const cmd = `python3 ./tools/panoramaSpliter.py ${elm.file} ${elm.resFile}`
                + ` ${height} ${width} ${yaw} ${pitch} ${fov}`;
            const { stdout, stderr } = await exec(cmd);
            console.log({
                stdout,
                stderr,
            });
        });
    });
    return queue;
}

function convertDate(date) {
    return date.split("-").reverse().join(".");
}

module.exports = {
    getList,
    getContentById,
    getTimelapseById,
    getCalendar,
    getCalendarByLineId,
    getListByPoint,
    getArchive,
};
