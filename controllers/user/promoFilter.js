const { PromoFilter } = require("../../models");
const companyFu = require("../../modules/companyFu");

const getList = async function getList(req, res, next) {
    let { companyId } = req.params;
    const { limit, page } = req.preparePagination();

    try {
        if (!companyId) {
            companyId = await companyFu.getDefCompanyId(req);
        }

        if (!companyFu.isPermint(companyId, req, res)) {
            return;
        }

        const { rows, count } = await PromoFilter.findAndCountAll({
            where: {
                companyId,
            },
            order: [["title", "ASC"]],
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
