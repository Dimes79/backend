const companyFu = require("../../modules/companyFu");
const { Line, Content } = require("../../models");

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
        const line = await Line.findOne({
            include: ["project", "sublines"],
            where: {
                id: req.params.modelID,
                projectId: req.params.projectId,
                status: "ACTIVE",
            },
        });
        if (!line) {
            res.sendError("notFound");
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(line.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.sendData(line);
    } catch (e) {
        next(e);
    }
};

exports.getByLineId = async function get(req, res, next) {
    try {
        const line = await Line.findOne({
            include: ["project", "sublines"],
            where: {
                id: req.params.modelID,
                status: "ACTIVE",
            },
        });
        if (!line) {
            res.sendError("notFound");
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(line.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        res.sendData(line);
    } catch (e) {
        next(e);
    }
};

exports.getContentsTabs = async function getContentsTabs(req, res, next) {
    const { modelID } = req.params;
    let { date } = req.query;
    try {
        const line = await Line.findByPk(modelID);
        if (!line) {
            res.sendError("notFound");
            return;
        }

        const isCompanyPermit = await companyFu.isPermintByProject(line.projectId, req, res);
        if (!isCompanyPermit) {
            return;
        }

        if (!date) {
            date = await Content.max("date", {
                where: {
                    lineId: modelID,
                },
            });
        }

        let { tabs } = line;

        if (tabs) {
            const queue = tabs.reduce((acc, tab) => acc.concat(checkTab(modelID, tab, date)), []);
            tabs = (await Promise.all(queue)).filter((tab) => tab);
        }

        res.sendData(tabs, undefined, { date });
    } catch (e) {
        next(e);
    }
};

async function checkTab(lineId, tab, date) {
    const content = await Content.findOne({
        where: {
            type: tab.toUpperCase(),
            date,
            lineId,
        },
    });
    return (content) ? content.type : null;
}
