const { pick } = require("lodash");
const { saveTmb, deleteContent } = require("../../modules/content");

// eslint-disable-next-line no-undef
const {
    Project, Line, Sequelize,
} = require("../../models");

const { Op } = Sequelize;

exports.getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    const where = {
        status: {
            [Op.or]: ["ACTIVE", "HIDDEN"],
        },
    };

    if (req.query.companyId) {
        where.companies = {
            [Op.contains]: [req.query.companyId],
        };
    }

    try {
        const { rows, count } = await Project.scope("forAuditors").findAndCountAll({
            where,
            order: [
                ["orderWeight", "DESC"],
                ["id", "DESC"],
                ["lines", "orderWeight", "DESC"],
                ["lines", "id", "DESC"],
            ],
            offset: (page - 1) * limit,
            include: ["lines"],
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

exports.add = async function add(req, res, next) {
    try {
        let model = await Project.findOne({ where: { name: req.body.name } });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }

        model = new Project(crData(req));
        await model.save();
        exports.getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.get = async function get(req, res, next) {
    try {
        const model = await Project.scope("forAuditors").findOne({
            where: {
                id: req.params.modelID,
                status: {
                    [Op.or]: ["ACTIVE", "HIDDEN"],
                },
            },
            include: [
                "pickets",
                {
                    model: Line,
                    as: "lines",
                    where: {
                        status: {
                            [Op.or]: ["ACTIVE", "HIDDEN"],
                        },
                    },
                    required: false,
                },
            ],
            order: [
                ["orderWeight", "DESC"],
                ["id", "DESC"],
                ["lines", "orderWeight", "DESC"],
                ["lines", "id", "DESC"],
            ],
        });

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
        const model = await Project.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        model.set(crData(req));
        await model.save();
        exports.get(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.delete = async function update(req, res, next) {
    try {
        const model = await Project.findByPk(req.params.modelID);
        if (model) {
            model.status = "INACTIVE";
            await model.save();
        }
        exports.getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.upload = async function upload(req, res, next) {
    try {
        const project = await Project.findByPk(req.params.modelID);
        if (!project) {
            res.sendError("notFound");
            return;
        }

        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const oldImage = project.image;

        try {
            project.image = await saveTmb(project.id, req.file.path, {
                src: [4000, 4000, null],
                tmb: [555, 166, "crop"],
            });
            project.save();
            res.sendData(project);

            deleteContent(oldImage);
        } catch (e) {
            next(e);
        }
    } catch (e) {
        next(e);
    }
};

function crData(req) {
    const data = pick(req.body, ["name", "description", "gps", "orderWeight", "meta", "companies", "auditRatio"]);

    if (req.body.status) {
        data.status = req.body.status;
    }

    return data;
}
