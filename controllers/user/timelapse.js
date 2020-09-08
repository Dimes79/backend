// eslint-disable-next-line no-undef
const { TimelapseInfo } = requireModel();

const getList = async function getList(req, res, next) {
    try {
        const rows = await TimelapseInfo.findAll({
            where: {
                contentId: req.params.contentId,
            },
            order: [["id", "ASC"]],
        });
        res.sendData(rows);
    } catch (e) {
        next(e);
    }
};

module.exports = {
    getList,
};
