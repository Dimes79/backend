const {
    Company, Project, Line, Sequelize: { Op },
} = require("../../models");

exports.getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const q = {
        where: {
            status: "ACTIVE",
        },
        order: [
            ["id", "ASC"],
        ],
        offset: (page - 1) * limit,
        limit,
    };

    if (req.user.kind !== "SUPER") {
        q.where.id = {
            [Op.in]: req.user.companies || [],
        };
    }

    try {
        const { rows, count } = await Company.findAndCountAll(q);
        const queue = rows.reduce((acc, company) => acc.concat(putProjects(company)), []);
        const companies = await Promise.all(queue);
        res.sendData(companies, count);
    } catch (e) {
        next(e);
    }
};

exports.get = async function get(req, res, next) {
    if (req.user.kind === "SUPER" || (req.user.projects && req.user.projects.includes(Number(req.params.modelID)))) {
        try {
            const model = await Project.findOne({
                where: {
                    id: req.params.modelID,
                    status: "ACTIVE",
                },
                include: ["lines", "pickets"],
            });
            if (!model) {
                res.status(400).send("NOT_FOUND");
            } else {
                res.sendData(model);
            }
        } catch (e) {
            next(e);
        }
    } else {
        res.status(400).send("DENIED");
    }
};

async function putProjects(company) {
    const q = {
        where: {
            companies: {
                [Op.contains]: [company.id],
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
    };
    // eslint-disable-next-line no-param-reassign
    company.projects = await Project.findAll(q);
    return company;
}
