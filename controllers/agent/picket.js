// eslint-disable-next-line no-undef
const { Picket } = requireModel();

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    try {
        const { rows, count } = await Picket.findAndCountAll({
            order: [["name", "ASC"]],
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
