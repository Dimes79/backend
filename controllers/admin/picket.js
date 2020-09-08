const { pick } = require("lodash");
const { Picket } = require("../../models");

async function list(req, res, next) {
    try {
        const q = {
            where: {},
            order: [["name", "asc"]],
        };
        if (req.query.projectId) {
            q.where.projectId = req.query.projectId;
        }
        if (req.query.order) {
            q.order = [req.query.order];
        }
        const { rows, count } = await Picket.findAndCountAll({
            ...q,
            ...req.pagination,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
}

async function get(req, res, next) {
    try {
        const model = await Picket.findOne({
            where: {
                id: req.params.id,
            },
            include: ["events"],
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }
        res.sendData(model);
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        const where = pick(req.body, ["name", "projectId"]);
        let model = await Picket.findOne({ where });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }
        model = await Picket.create(crData(req));
        res.send("OK");
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    try {
        const model = await Picket.findByPk(req.params.id);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        await model.update(crData(req));
        res.sendData(model);
    } catch (e) {
        next(e);
    }
}

async function destroy(req, res, next) {
    try {
        const model = await Picket.findByPk(req.params.id);
        if (model) {
            await model.destroy();
            res.send("OK");
        } else {
            res.status(400).send(null);
        }
    } catch (e) {
        next(e);
    }
}

const keys = ["name", "gps", "projectId"];

function crData(req) {
    return pick(req.body, keys);
}

module.exports = {
    list,
    get,
    create,
    update,
    destroy,
};
