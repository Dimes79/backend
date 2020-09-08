// eslint-disable-next-line no-undef
const { User, Sequelize } = requireModel();
const { Op } = Sequelize;
const { pick } = require("lodash");

exports.my = function my(req, res) {
    return res.sendData(req.user);
};

exports.getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    const where = {
        status: ["ACTIVE"],
        kind: ["AGENT", "USER", "AUDITOR", "MODERATOR"],
    };

    const { companyId, includeDisabled, includeSupers } = req.query;

    if (companyId) {
        where.companies = {
            [Op.contains]: [companyId],
        };
    }

    if (String(includeDisabled).toLowerCase() === "true") {
        where.status.push("INACTIVE");
    }

    if (String(includeSupers).toLowerCase() === "true") {
        where.kind.push("SUPER");
    }

    try {
        const { rows, count } = await User.findAndCountAll({
            where,
            order: [["id", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

exports.add = async function add(req, res, next) {
    const { email, password } = req.body;
    if (email && password) {
        try {
            let model = await User.findOne({ where: { email } });
            if (model) {
                res.sendError("alreadyExists");
                return;
            }
            model = new User(crData(req));
            await model.asyncSetPassword(password);
            await model.save();
            exports.getList(req, res, next);
        } catch (e) {
            next(e);
        }
    }
};

exports.get = async function get(req, res, next) {
    try {
        const model = await User.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

exports.update = async function update(req, res, next) {
    try {
        let model = await User.findOne({ where: { email: req.body.email, id: { [Op.ne]: req.params.modelID } } });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }

        model = await User.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        model.updateAttributes(crData(req));
        if (req.body.password) {
            await model.asyncSetPassword(req.body.password);
        }
        await model.save();

        exports.getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.delete = async function deleteRow(req, res, next) {
    res.status(403).send("Удаление отключено");
    // try {
    //     const model = await User.findByPk(req.params.modelID);
    //     if (model) {
    //         await model.destroy();
    //     }
    //     exports.getList(req, res, next);
    // } catch (e) {
    //     next(e);
    // }
};


function crData(req) {
    const data = pick(req.body, ["name", "email", "kind", "meta", "projects", "companies", "canCreateTmpUser"]);

    if (req.body.status) {
        data.status = req.body.status;
    }

    return data;
}
