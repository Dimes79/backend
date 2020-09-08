// eslint-disable-next-line no-undef
const { Hit, User } = requireModel();

const getList = async function commonInfo(req, res, next) {
    const { limit, page } = req.preparePagination();

    try {
        const { rows, count } = await Hit.findAndCountAll({
            include: [{
                model: User,
                as: "user",
            }],
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
