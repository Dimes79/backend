const { pick } = require("lodash");
const { saveContent, deleteContent } = require("../../modules/content");
const { Content, Line, Sequelize: { Op } } = require("../../models");
const linkSublinesFu = require("../../modules/linkSublines");

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const { dateBefore, dateTo } = req.query;
    let { dateFrom } = req.query;
    const { date } = req.body;
    const { lineId, type } = req.params;

    const where = {
        status: {
            [Op.or]: ["ACTIVE"],
        },
        lineId,
        type: type.toUpperCase(),
    };


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

    if (!dateFrom && date) {
        dateFrom = date;
    }

    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const { rows, count } = await Content.findAndCountAll({
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

        const { lineId, type } = req.params;
        const line = await Line.findById(lineId);

        const data = {
            projectId: line.projectId,
            lineId,
            type: type.toUpperCase(),
            userId: req.user.id,
        };

        const matches = req.file.originalname.match(/^(\d{4})(\d{2})(\d{2})[^\d]+/);
        if (matches) {
            data.date = `${matches[1]}-${matches[2]}-${matches[3]}`;
        }

        const src = await saveContent(req.params.type, req.params.projectId, req.file.path, data.date);

        if (!src) {
            res.sendError("unkError");
            return;
        }

        data.src = src;

        const model = new Content(data);
        await model.save();

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const getCalendar = async function getCalendar(req, res, next) {
    const where = {
        status: {
            [Op.or]: ["ACTIVE"],
        },
        lineId: req.params.lineId,
        type: req.params.type.toUpperCase(),
    };

    const { dateFrom } = req.query;
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
        const model = await Content.findById(req.params.contentId);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        const data = pick(req.body, ["description", "gps", "date", "meta", "status", "magneticAngle"]);

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

const linkSubline = async function linkSubline(req, res, next) {
    try {
        const {
            sublineId, contents, date, lineId,
        } = req.body;

        await linkSublinesFu.link(sublineId, contents, date, lineId);

        res.sendData({ success: true });
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
    linkSubline,
};
