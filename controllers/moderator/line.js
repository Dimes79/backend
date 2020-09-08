const { Line, Subline } = require("../../models");

const getList = async function getList(req, res, next) {
    const { projectId } = req.params;
    const { limit, page } = req.preparePagination();

    try {
        const where = {
            status: "ACTIVE",
        };
        if (projectId) {
            where.projectId = projectId;
        }

        const { rows, count } = await Line.findAndCountAll({
            where,
            include: [{
                model: Subline,
                as: "sublines",
                where: {
                    status: "ACTIVE",
                },
            }],
            order: [["orderWeight", "DESC"], ["id", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

const get = async function get(req, res, next) {
    try {
        const { lineId } = req.params;
        const model = await Line.findOne({
            where: {
                id: lineId,
                status: "ACTIVE",
            },
            include: [
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

module.exports = {
    getList,
    get,
};
