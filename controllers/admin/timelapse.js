const _ = require("lodash");
// eslint-disable-next-line no-undef
const { TimelapseInfo, Content, Sequelize } = requireModel();
const { Op } = Sequelize;

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

const add = async function add(req, res, next) {
    try {
        const content = await Content.findByPk(req.params.contentId);
        if (!content) {
            res.sendError("contentNotFound");
            return;
        }

        const model = new TimelapseInfo();
        model.projectId = content.projectId;
        model.lineId = content.lineId;
        model.contentId = content.id;
        model.type = req.body.type;
        model.name = req.body.name;
        model.dataInfo = req.body.dataInfo;
        await model.save();

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const update = async function update(req, res, next) {
    try {
        const model = await TimelapseInfo.findByPk(req.params.modelId);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        model.type = req.body.type;
        model.name = req.body.name;
        model.dataInfo = req.body.dataInfo;
        await model.save();

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const deleteRow = async function deleteRow(req, res, next) {
    try {
        const model = await TimelapseInfo.findByPk(req.params.modelId);
        if (model) {
            await model.destroy();
        }

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const cloneTable = async function cloneTable(req, res, next) {
    try {
        const content = await Content.findByPk(req.params.contentId);
        if (!content) {
            res.sendError("contentNotFound");
            return;
        }

        const prev = await Content.findOne({
            where: {
                projectId: content.projectId,
                lineId: content.lineId,
                id: {
                    [Op.lt]: content.id,
                },
            },
            order: [["id", "desc"]],
        });

        if (!prev) {
            res.sendError("contentNotFound");
            return;
        }

        const rows = await TimelapseInfo.findAll({
            where: {
                contentId: prev.id,
            },
            order: [["id", "ASC"]],
        });

        let queue = Promise.resolve();
        rows.forEach((data) => {
            const newData = _.pick(data, ["projectId", "lineId", "type", "name", "dataInfo"]);
            newData.contentId = content.id;
            const model = new TimelapseInfo(newData);
            queue = queue.then(() => model.save());
        });

        queue = queue.then(() => getList(req, res, next));
    } catch (e) {
        next(e);
    }
}

module.exports = {
    getList,
    add,
    update,
    deleteRow,
    cloneTable,
};
