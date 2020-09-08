/* eslint-disable no-param-reassign */
const { Project, Line, Sequelize: { Op } } = require("../../models");

const getList = async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    const where = {};
    where.status = {
        [Op.or]: ["ACTIVE", "HIDDEN"],
    };

    const { user } = req;
    if (user.kind !== "SUPER") {
        where.id = {
            [Op.in]: user.projects,
        };
    }

    try {
        const { rows, count } = await Project.findAndCountAll({
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

const getListAll = async function getListAll(req, res, next) {
    const where = {
        status: {
            [Op.or]: ["ACTIVE", "HIDDEN"],
        },
    };

    const { user } = req;
    if (user.kind !== "SUPER") {
        where.id = {
            [Op.in]: user.projects,
        };
    }

    try {
        const rows = await Project.findAll({
            attributes: ["id", "name", "description", "image"],
            where,
            include: [{
                model: Line,
                as: "lines",
                attributes: ["id", "name", "description", "image", "orderWeight"],
                where: {
                    status: {
                        [Op.or]: ["ACTIVE", "HIDDEN"],
                    },
                },
                required: false,
            }],
            order: [["orderWeight", "DESC"], ["id", "DESC"], [{ model: Line, as: "lines" }, "orderWeight", "DESC"]],
        });

        rows.forEach((row) => {
            if (row.status === "HIDDEN") {
                row.status = "ACTIVE";
            }
        });

        res.sendData(rows);
    } catch (e) {
        next(e);
    }
};

module.exports = {
    getList,
    getListAll,
};
