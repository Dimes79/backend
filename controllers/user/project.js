const companyFu = require("../../modules/companyFu");

// eslint-disable-next-line no-undef
const {
    Project, Line, Sequelize: { Op },
} = require("../../models");

exports.getList = async function getList(req, res, next) {
    let { companyId } = req.params;

    try {
        if (!companyId) {
            companyId = await companyFu.getDefCompanyId(req);
        }

        if (!companyFu.isPermint(companyId, req, res)) {
            return;
        }

        const { limit, page } = req.preparePagination();
        const q = {
            where: {
                companies: {
                    [Op.contains]: [companyId],
                },
                status: "ACTIVE",
            },
            include: [
                "pickets",
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

exports.get = async function get(req, res, next) {
    try {
        const model = await Project.findOne({
            where: {
                id: req.params.modelID,
                status: "ACTIVE",
            },
            include: ["lines", "pickets"],
        });
        if (!model) {
            res.status(404).send("NOT_FOUND");
            return;
        }

        if (!companyFu.isPermintCompanies(model.companies, req, res)) {
            return;
        }

        res.sendData(model);
    } catch (e) {
        next(e);
    }
};
