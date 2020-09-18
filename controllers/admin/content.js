const {uniqueId} = require("lodash");
const {saveContent, deleteContent, editVideo} = require("../../modules/content");
const {getExif} = require("../../modules/exif");
const {crPoints} = require("../../modules/restoreGps");
const linkSublinesFu = require("../../modules/linkSublines");

const {Content, Sequelize: {Op}} = require("../../models");

const getList = async function getList(req, res, next) {
    const {limit, page} = req.preparePagination();

    const where = {
        status: {
            [Op.or]: ["ACTIVE", "WAITING"],
        },
        projectId: req.params.projectId,
        lineId: req.params.lineId,
        type: req.params.type.toUpperCase(),
    };

    let {dateFrom} = req.query;
    const {date} = req.body;
    if (!dateFrom && date) {
        dateFrom = date;
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
        const {rows, count} = await Content.findAndCountAll({
            where,
            order: [["pointId", "DESC"], ["id", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

const add = async function add(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const exif = await getExif(req.file.path);
        const data = {
            projectId: req.params.projectId,
            lineId: req.params.lineId,
            type: req.params.type.toUpperCase(),
            userId: req.user.id,
        };

        if (exif) {
            data.gps = exif.gps;
            if (exif.date) {
                data.date = exif.date;
            }
            if (exif.datetime) {
                data.contentCreateDate = exif.datetime;
            }

            if (exif.magneticAngle) {
                data.magneticAngle = Math.round(exif.magneticAngle);
            }
        }

        const matches = req.file.originalname.match(/^(\d{4})(\d{2})(\d{2})[^\d]+/);
        if (matches) {
            data.date = `${matches[1]}-${matches[2]}-${matches[3]}`;
        }

        const UID = `CONVERT_${uniqueId("CONTENT_")}`;

        console.log(UID);
        console.time(UID);

        const src = await saveContent(req.params.type, req.params.projectId, req.file.path, data.date);

        console.timeEnd(UID);

        if (!src) {
            res.sendError("unkError");
            return;
        }

        data.src = src;

        const model = new Content(data);
        await model.save();

        res.json({success: true});
    } catch (e) {
        next(e);
    }
};

const getCalendar = async function getCalendar(req, res, next) {
    const where = {
        status: {
            [Op.or]: ["ACTIVE", "WAITING"],
        },
        projectId: req.params.projectId,
        lineId: req.params.lineId,
        type: req.params.type.toUpperCase(),
    };

    const {dateFrom} = req.query;
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

const update = async function update(req, res, next) {
    try {
        const model = await Content.findOne({
            where: {
                id: req.params.modelID,
                projectId: req.params.projectId,
            },
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }

        const data = {
            description: req.body.description,
            gps: req.body.gps,
            date: req.body.date,
        };

        if (req.body.meta) {
            data.meta = req.body.meta;
        }

        if (req.body.status) {
            data.status = req.body.status;
        }

        if (req.body.videocut) {
            data.src = await editVideo(model.projectId, model.src, req.body.videocut);
        }

        if (req.body.magneticAngle) {
            data.magneticAngle = req.body.magneticAngle;
        }

        data.status = "ACTIVE";

        model.set(data);
        await model.save();

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

const deleteModel = async function deleteModel(req, res, next) {
    try {
        const model = await Content.findByPk(req.params.modelID);
        if (model) {
            deleteContent(model.src);
            await model.destroy();
        }
        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const recalculateGps = async function recalculateGps(req, res, next) {
    try {
        const {projectId, lineId} = req.params;
        const {date} = req.body;

        await crPoints(projectId, lineId, date);
        res.sendData({});
    } catch (e) {
        next(e);
    }
};

const linkSubline = async function linkSubline(req, res, next) {
    try {
        const {
            sublineId, contents, date, lineId,
        } = req.body;

        await linkSublinesFu.link(sublineId, contents, date, lineId);

        res.sendData({success: true});
    } catch (e) {
        next(e);
    }
};

const setFirst = async function (req, res, next) {
    try {
        const {lineId, type} = req.params;
        const {
            date, id
        } = req.body;


        await Content.update({isFirst: false}, {
            where: {
                lineId,
                type: type.toUpperCase(),
                date,
            }
        });
        const model = await Content.findByPk(id);
        if (model) {
            model.isFirst = true;
            await model.save();
        }


        res.sendData({success: true});
    } catch (e) {
        next(e);
    }
};

module.exports = {
    getList,
    add,
    getCalendar,
    update,
    delete: deleteModel,
    recalculateGps,
    linkSubline,
    setFirst,
};
