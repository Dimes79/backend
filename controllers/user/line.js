const companyFu = require("../../modules/companyFu");
const { Line } = require("../../models");

exports.getList = async function getList(req, res, next) {
    const { projectId } = req.params;
    const { limit, page } = req.preparePagination();

    try {
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const { rows, count } = await Line.findAndCountAll({
            where: {
                projectId,
                status: "ACTIVE",
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

exports.get = async function get(req, res, next) {
    try {
        const model = await Line.findOne({
            include: ["project", "sublines"],
            where: {
                id: req.params.modelID,
                projectId: req.params.projectId,
                status: "ACTIVE",
            },
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

exports.getByLineId = async function get(req, res, next) {
    try {
        const model = await Line.findOne({
            include: ["project", "sublines"],
            where: {
                id: req.params.modelID,
                status: "ACTIVE",
            },
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
