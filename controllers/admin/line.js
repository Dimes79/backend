const { saveTmb, deleteContent } = require("../../modules/content");

const {
    Line, Project, Subline, Sequelize,
} = require("../../models/");

const { Op } = Sequelize;

exports.getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    try {
        const { rows, count } = await Line.findAndCountAll({
            where: {
                projectId: req.params.projectId,
                status: {
                    [Op.or]: ["ACTIVE", "HIDDEN"],
                },
            },
            order: [["orderWeight", "DESC"], ["id", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

exports.add = async function add(req, res, next) {
    try {
        let model = await Line.findOne({ where: { name: req.body.name, projectId: req.params.projectId } });
        if (model) {
            res.sendError("alreadyExists");
            return;
        }

        model = new Line(crData(req));
        await model.save();

        const project = await Project.findOne({
            where: { id: req.params.projectId },
            include: [{
                model: Line,
                as: "lines",
                where: { status: "ACTIVE" },
                required: false,
            }],
        });
        res.sendData(project);

        // exports.getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.get = async function get(req, res, next) {
    try {
        const {modelID, projectId} = req.params;
        const model = await Line.findOne({
            where: {
                id: modelID,
                projectId,
                status: {
                    [Op.or]: ["ACTIVE", "HIDDEN"],
                },
            },
            include: [
                "project",
                "sublines",
            ],
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }
        res.sendData(model);
    } catch (e) {
        console.log(e);
        next(e);
    }
};

exports.update = async function update(req, res, next) {
    try {
        const model = await Line.findOne({
            where: {
                id: req.params.modelID,
                projectId: req.params.projectId,
            },
            include: ["project"],
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }
        model.set(crData(req));
        await model.save();

        res.sendData(model);

        // exports.getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

exports.delete = async function update(req, res, next) {
    try {
        const model = await Line.findByPk(req.params.modelID);
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
        const line = await Line.findByPk(req.params.modelID);
        if (!line) {
            res.sendError("notFound");
            return;
        }

        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const oldImage = line.image;

        try {
            line.image = await saveTmb(req.params.projectId, req.file.path, {
                src: [4000, 4000, null],
                tmb: [370, 166, "crop"],
            });
            line.save();
            res.sendData(line);

            deleteContent(oldImage);
        } catch (e) {
            next(e);
        }
    } catch (e) {
        next(e);
    }
};

function crData(req) {
    const data = {
        name: req.body.name,
        description: req.body.description,
        gps: req.body.gps,
        agentPlans: req.body.agentPlans,
        projectId: req.params.projectId,
        orderWeight: req.body.orderWeight,
        tabs: req.body.tabs,
        mergeAero: req.body.mergeAero,
    };

    if (req.body.status) {
        data.status = req.body.status;
    }

    return data;
}
