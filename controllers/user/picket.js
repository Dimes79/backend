const companyFu = require("../../modules/companyFu");
const { Picket } = require("../../models");

exports.list = async function list(req, res, next) {
    const { projectId } = req.params;

    try {
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const { rows, count } = await Picket.findAndCountAll({
            where: {
                projectId,
            },
            include: ["events"],
            ...req.pagination,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

exports.get = async function get(req, res, next) {
    try {
        const model = await Picket.findOne({
            where: {
                id: req.params.modelID,
            },
            include: ["events"],
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(model.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};
