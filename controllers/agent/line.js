/* eslint-disable no-param-reassign */
// eslint-disable-next-line no-undef
const { Line, Sequelize } = requireModel();
const { Op } = Sequelize;

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    const where = {};
    where.status = {
        [Op.or]: ["ACTIVE", "HIDDEN"],
    };

    try {
        const { rows, count } = await Line.findAndCountAll({
            where,
            order: [["updatedAt", "ASC"]],
            offset: (page - 1) * limit,
            limit,
        });

        rows.forEach((row) => {
            if (row.status === "HIDDEN") {
                row.status = "ACTIVE";
            }
        });

        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

module.exports = {
    getList,
};
