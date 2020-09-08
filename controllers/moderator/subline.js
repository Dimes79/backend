const { Subline } = require("../../models");

const getList = async function getList(req, res, next) {
    const { lineId } = req.params;
    const { limit, page } = req.preparePagination();

    try {
        const where = {
            status: "ACTIVE",
        };
        if (lineId) {
            where.lineId = lineId;
        }

        const { rows, count } = await Subline.findAndCountAll({
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

module.exports = {
    getList,
};
