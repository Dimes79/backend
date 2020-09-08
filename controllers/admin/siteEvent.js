const moment = require("moment");
const {
    SiteEvent, User, Sequelize: { Op }, sequelize,
} = require("../../models");

const userAttributes = ["id", "email", "name", "kind"];
const userModel = {
    model: User,
    as: "user",
    attributes: userAttributes,
};

async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();
    const where = await getWhere(req);

    try {
        const { rows, count } = await SiteEvent.findAndCountAll({
            where,
            include: [userModel],
            order: [["createdAt", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
}

async function getListByUser(req, res, next) {
    const { limit, page } = req.preparePagination();
    const order = getOrder(req);
    const where = await getWhere(req);

    try {
        const { rows, count } = await SiteEvent.findAndCountAll({
            attributes: [
                "userId",
                [sequelize.fn("count", sequelize.col("userId")), "total"],
                [sequelize.fn("max", sequelize.col("SiteEvent.createdAt")), "lastDate"],
            ],
            where,
            include: [userModel],
            distinct: true,
            col: "userId",
            group: ["userId", "user.id"],
            order,
            offset: (page - 1) * limit,
            limit,
        });

        const countGroup = (count) ? count.length : 0;

        res.sendData(rows, countGroup);
    } catch (e) {
        next(e);
    }
}

function getOrder(req) {
    const { orderBy, orderDir } = req.query;
    const fields = ["total", "lastDate"];
    const direction = ["asc", "desc"];
    if (!orderBy || !fields.includes(orderBy)) {
        return [[sequelize.col("total"), "desc"], [sequelize.col("lastDate"), "desc"]];
    }

    let dir = "asc";
    if (orderDir && direction.includes(orderDir)) {
        dir = orderDir;
    }

    return [[sequelize.col(orderBy), dir]];
}

async function getWhere(req) {
    const {
        dateFrom, dateTo, event, userId, source, includeStaff,
    } = req.query;

    const where = {};
    if (dateFrom) {
        where.createdAt = {
            [Op.gte]: moment(dateFrom).toDate(),
        };
    }

    if (dateTo) {
        where.createdAt = { ...where.createdAt, [Op.lt]: moment(dateTo).add(1, "days").toDate() };
    }

    if (event) {
        where.event = event;
    }

    if (userId) {
        where.userId = userId;
    } else {
        let users = [];
        if (includeStaff.toLowerCase() === "true") {
            users = await User.findAll({ raw: true });
        } else {
            users = await User.findAll({ where: { kind: "USER" }, raw: true });
        }
        where.userId = {
            [Op.or]: users.map((u) => u.id),
        };
    }

    if (source === "APPONLY") {
        where.source = {
            [Op.or]: ["IOS", "ANDROID"],
        };
    } else if (source) {
        where.source = source.toUpperCase();
    }

    return where;
}

module.exports = {
    getList,
    getListByUser,
};
