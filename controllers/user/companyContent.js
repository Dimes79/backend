const companyFu = require("../../modules/companyFu");
const { singPath } = require("../../modules/signUrlFu");
const { CompanyContent, Sequelize: { Op } } = require("../../models");

async function getStreams(req, res, next) {
    let { companyId } = req.params;

    try {
        if (!companyId) {
            companyId = await companyFu.getDefCompanyId(req);
        }

        if (!companyFu.isPermint(companyId, req, res)) {
            return;
        }


        const rows = await CompanyContent.findAll({
            where: {
                companyId,
                section: "STREAM",
                type: "VIDEO",
            },
            order: [["date", "DESC"]],
        });

        let m;
        if (rows.length > 0) {
            [m] = rows;
        }

        if (m) {
            m.src.stream = "https://platforma.tech/public/playlist.m3u";
            m.description = "В эфире";
        }

        const rowsSigned = await singRows(req.user.id, rows);

        res.sendData(rowsSigned);
    } catch (e) {
        next(e);
    }
}

async function getPromo(req, res, next) {
    let { companyId } = req.params;
    const { filterId } = req.query;

    try {
        if (!companyId) {
            companyId = await companyFu.getDefCompanyId(req);
        }

        if (!companyFu.isPermint(companyId, req, res)) {
            return;
        }

        const where = {
            companyId,
            section: "PROMO",
            type: "VIDEO",
        };

        if (filterId) {
            where.filterId = {
                [Op.contains]: filterId,
            };
        }

        const rows = await CompanyContent.findAll({
            where,
            order: [["date", "DESC"]],
        });

        const rowsSigned = await singRows(req.user.id, rows);

        res.sendData(rowsSigned);
    } catch (e) {
        next(e);
    }
}

async function singRows(userId, rows) {
    const queue = rows.reduce((acc, content) => acc.concat(singContent(userId, content)), []);
    return Promise.all(queue);
}

async function singContent(userId, content) {
    const { src } = content;

    const keys = Object.keys(src);
    const queue = keys.reduce((acc, key) => acc.concat(singPath(userId, src[key])), []);
    const signedUrls = await Promise.all(queue);

    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        src[key] = signedUrls[i];
    }
    return content;
}

module.exports = {
    getPromo,
    getStreams,
};
