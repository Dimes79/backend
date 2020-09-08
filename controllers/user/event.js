const companyFu = require("../../modules/companyFu");
const { Event, Picket } = require("../../models");

exports.list = async function list(req, res, next) {
    const { picketId } = req.params;

    try {
        const projectId = await getProjectId(picketId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        const { rows, count } = await Event.findAndCountAll({
            where: {
                picketId,
            },
            ...req.pagination,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

exports.get = async function get(req, res, next) {
    try {
        const model = await Event.findOne({
            where: {
                id: req.params.modelID,
            },
        });
        if (!model) {
            res.sendError("notFound");
            return;
        }
        const projectId = await getProjectId(model.picketId);
        const isCompanyPermit = await companyFu.isPermintByProject(projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

async function getProjectId(picketId) {
    const picket = await Picket.findByPk(picketId);
    if (!picket) {
        return 0;
    }

    return picket.projectId;
}
