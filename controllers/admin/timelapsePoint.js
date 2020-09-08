const { pick } = require("lodash");
const { TimelapsePoint, Sequelize } = require("../../models");

const { Op } = Sequelize;

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const { lineId } = req.params;

    try {
        const { rows, count } = await TimelapsePoint.findAndCountAll({
            where: {
                status: "ACTIVE",
                lineId,
            },
            order: [["id", "ASC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

const add = async function add(req, res, next) {
    const { lineId } = req.params;

    try {
        let model = await TimelapsePoint.findOne({ where: { title: req.body.title, lineId } });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }

        const data = { ...crData(req.body), lineId };
        model = new TimelapsePoint(data);
        await model.save();

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const update = async function update(req, res, next) {
    const { lineId, modelID } = req.params;

    try {
        let model = await TimelapsePoint.findOne({
            where: {
                title: req.body.title,
                lineId,
                id: {
                    [Op.ne]: modelID,
                },
            },
        });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }

        model = await TimelapsePoint.findByPk(modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        model.set(crData(req.body));
        await model.save();

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

const get = async function get(req, res, next) {
    const { modelID } = req.params;

    try {
        const model = await TimelapsePoint.findByPk(modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        res.sendData(model);
    } catch (e) {
        next(e);
    }
};


const remove = async function remove(req, res, next) {
    const { modelID } = req.params;

    try {
        const model = await TimelapsePoint.findByPk(modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        model.status = "INACTIVE";
        await model.save();
        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

function crData(data) {
    return pick(data, ["title", "description", "meta", "gps"]);
}

module.exports = {
    getList,
    add,
    update,
    get,
    delete: remove,
};
