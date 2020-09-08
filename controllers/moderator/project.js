const { Project, Line } = require("../../models");

const getList = async function getList(req, res, next) {
    try {
        const { limit, page } = req.preparePagination();
        const q = {
            where: {
                status: "ACTIVE",
            },
            include: [
                {
                    model: Line,
                    as: "lines",
                    where: {
                        status: "ACTIVE",
                    },
                },
            ],
            order: [
                ["orderWeight", "DESC"],
                ["id", "DESC"],
                ["lines", "orderWeight", "DESC"],
            ],
            offset: (page - 1) * limit,
            limit,
        };
        const { rows, count } = await Project.findAndCountAll(q);
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

const get = async function get(req, res, next) {
    try {
        const { projectId } = req.params;
        const model = await Project.findOne({
            where: {
                id: projectId,
                status: "ACTIVE",
            },
            include: [
                "lines",
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
