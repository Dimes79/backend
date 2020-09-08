const { pick } = require("lodash");
const { PromoFilter } = require("../../models");

async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const { companyId, type } = req.query;

    const where = {};
    if (companyId) {
        where.companyId = companyId;
    }
    if (type) {
        where.type = type.toUpperCase();
    }

    try {
        const { rows, count } = await PromoFilter.findAndCountAll({
            where,
            include: ["company"],
            order: [["title", "ASC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
}

async function add(req, res, next) {
    try {
        const data = crData(req.body);
        if (!data) {
            res.sendError("badRequest", 400);
            return;
        }
        const model = new PromoFilter(data);
        await model.save();

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    const { modelID } = req.params;

    try {
        const model = await PromoFilter.findByPk(modelID);
        if (!model) {
            res.sendError("notFound", 404);
            return;
        }
        const data = crData(req.body);
        if (!data) {
            res.sendError("badRequest", 400);
            return;
        }

        model.set(data);
        await model.save();

        res.sendData(model);
    } catch (e) {
        next(e);
    }
}

async function get(req, res, next) {
    const { modelID } = req.params;

    try {
        const model = await PromoFilter.find({
            where: {
                id: modelID,
            },
            include: ["company"],
        });
        if (!model) {
            res.sendError("notFound", 404);
            return;
        }
        res.sendData(model);
    } catch (e) {
        next(e);
    }
}


async function remove(req, res, next) {
    const { modelID } = req.params;

    try {
        const model = await PromoFilter.findByPk(modelID);
        if (!model) {
            res.sendError("notFound", 404);
            return;
        }
        await model.destroy();
        getList(req, res, next);
    } catch (e) {
        next(e);
    }
}

function crData(data) {
    const obj = pick(data, ["title", "companyId", "type"]);
    if (obj.type) {
        obj.type = obj.type.toUpperCase();
    }
    if (!obj.title) {
        return undefined;
    }

    return obj;
}

module.exports = {
    getList,
    add,
    update,
    get,
    delete: remove,
};
