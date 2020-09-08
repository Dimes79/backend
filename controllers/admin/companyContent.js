const { saveCompanyContent, replaceTmbContent, deleteContent } = require("../../modules/content");

// eslint-disable-next-line no-undef
const { CompanyContent, Sequelize } = requireModel();
const { Op } = Sequelize;

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    const where = {
        companyId: req.params.companyId,
        section: req.params.section.toUpperCase(),
        type: req.params.type.toUpperCase(),
    };

    let { dateFrom } = req.query;
    const { date } = req.body;
    if (!dateFrom && date) {
        dateFrom = date;
    }
    const dateTo = req.query.dateTo || dateFrom;
    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const { rows, count } = await CompanyContent.findAndCountAll({
            where,
            order: [["date", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
};

const add = async function add(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const data = {
            companyId: req.params.companyId,
            section: req.params.section.toUpperCase(),
            type: req.params.type.toUpperCase(),
            date: req.body.date,
            description: req.body.description,
            filterId: req.body.filterId,
        };

        const src = await saveCompanyContent(data.companyId, req.params.type, req.file.path);

        if (!src) {
            res.sendError("unkError");
            return;
        }

        data.src = src;

        const model = new CompanyContent(data);
        await model.save();

        getList(req, res, next);
    } catch (e) {
        next(e);
    }
};

const getCalendar = async function getCalendar(req, res, next) {
    const where = {
        companyId: req.params.companyId,
        section: req.params.section.toUpperCase(),
        type: req.params.type.toUpperCase(),
    };

    const { dateFrom } = req.query;
    const dateTo = req.query.dateTo || dateFrom;
    if (dateFrom && !dateTo) {
        where.date = dateFrom;
    } else if (dateFrom && dateTo) {
        where.date = {
            [Op.between]: [dateFrom, dateTo],
        };
    }

    try {
        const rows = await CompanyContent.findAll({
            attributes: ["date"],
            where,
            group: "date",
            order: [["date", "DESC"]],
        });
        const dates = rows.reduce((acc, row) => acc.concat(row.date), []);
        res.sendData(dates);
    } catch (e) {
        next(e);
    }
};

const update = async function update(req, res, next) {
    try {
        const model = await CompanyContent.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        const data = {
            date: req.body.date,
            description: req.body.description,
            filterId: req.body.filterId,
        };
        model.set(data);
        await model.save();

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

const remove = async function remove(req, res, next) {
    try {
        const model = await CompanyContent.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }
        if (model) {
            deleteContent(model.src);
            await model.destroy();
        }
        res.sendData({});
    } catch (e) {
        next(e);
    }
};

const updateTmb = async function updateTmb(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const model = await CompanyContent.findByPk(req.params.modelID);
        if (!model) {
            res.sendError("notFound");
            return;
        }

        const src = await replaceTmbContent(model.companyId, model.src, req.file.path);

        if (!src) {
            res.sendError("unkError");
            return;
        }

        model.src = src;

        await model.save();
        res.sendData(model);
    } catch (e) {
        next(e);
    }
};

module.exports = {
    getList,
    add,
    getCalendar,
    update,
    delete: remove,
    updateTmb,
};
