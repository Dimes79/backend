const moment = require("moment");

const {
    Sequelize, Project, Line, Content,
    // eslint-disable-next-line no-undef
} = requireModel();
const { Op } = Sequelize;
const types = {
    photo: ["IMAGE", "VIDEO", "PANORAMA"],
    aerial: ["AERIAL"],
    contents: ["PANORAMA","AERIAL"],
};

const correctDateFrom = "2019-09-01";

const common = async function common(req, res) {
    const { objects, type, date } = req.params;
    const { dateFrom, dateTo } = parseDates(date);

    const [projectId, lineId] = objects.split(/-/);

    if (!types[type]) {
        return res.send("unk. content type");
    }

    let projectName;

    const project = await Project.scope("forAuditors").findByPk(projectId);
    if (!project) {
        return res.send("unk. project");
    }
    projectName = project.name;

    let line = null;
    if (lineId) {
        line = await Line.findByPk(lineId);
        if (!lineId) {
            return res.send("unk. line");
        }
        projectName += ` - ${line.name}`;
    }


    let result = await getCommonRows(projectId, lineId, type, dateFrom, dateTo);
    result = correctResult(result, project.auditRatio);

    const { rows, total } = result;

    return res.render("audit/common", {
        type,
        dateFrom,
        dateTo,
        projectId,
        projectName,
        rows,
        total,
        objects,
    });
};

const content = async function content(req, res) {
    const { objects, type, date } = req.params;
    const [projectId, lineId] = objects.split(/-/);

    let projectName;

    const project = await Project.scope("forAuditors").findByPk(projectId);
    if (!project) {
        return res.send("unk. project");
    }
    projectName = project.name;

    let line = null;
    if (lineId) {
        line = await Line.findByPk(lineId);
        if (!lineId) {
            return res.send("unk. line");
        }
        projectName += ` - ${line.name}`;
    }

    let rows = await getContentRows(projectId, lineId, type, date);
    if (isCanCorrect(project.auditRatio, date)) {
        const count = Math.ceil((rows.length * project.auditRatio) / 100);
        rows = rows.splice(0, count);
    }

    return res.render("audit/content", {
        type,
        date,
        projectId,
        projectName,
        rows,
    });
};

function correctResult(result, ratio) {
    const { rows } = result;
    const out = {
        rows: [],
        total: {
            images: 0,
            videos: 0,
            panoramas: 0,
            aerials: 0,
            total: 0,
        },
    };
    const fileds = ["images", "videos", "panoramas", "aerials"];

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const data = {
            date: row.date,
            total: 0,
        };
        fileds.forEach((key) => {
            let value = parseInt(row[key], 10);
            if (isCanCorrect(ratio, data.date)) {
                value = Math.ceil((value * ratio) / 100);
            }
            data[key] = value;
            data.total += value;
            out.total[key] += value;
            out.total.total += value;
        });
        out.rows.push(data);
    }

    return out;
}

async function getContentRows(projectId, lineId, type, date) {
    const where = {
        status: "ACTIVE",
        projectId,
        type: type.toUpperCase(),
        date,
    };
    if (lineId) {
        where.lineId = lineId;
    }

    const rows = await Content.findAll({
        where,
        order: [["date", "ASC"]],
    });

    const out = [];

    let pos = 0;
    rows.forEach((row) => {
        pos += 1;

        out.push({
            pos,
            src: row.src,
        });
    });

    return out;
}

async function getCommonRows(projectId, lineId, type, dateFrom, dateTo) {
    const where = {
        status: "ACTIVE",
        projectId,
        type: {
            [Op.in]: types[type],
        },
        date: {
            [Op.between]: [dateFrom, dateTo],
        },
    };

    if (lineId) {
        where.lineId = lineId;
    }

    const list = await Content.findAll({
        where,
        order: [["date", "ASC"]],
    });

    const rows = [];
    const total = {
        images: 0,
        videos: 0,
        panoramas: 0,
        aerials: 0,
        total: 0,
    };
    let lastDate;
    let lastRow;
    list.forEach((row) => {
        const { date } = row;
        if (date !== lastDate) {
            lastDate = date;
            lastRow = {
                date,
                images: 0,
                videos: 0,
                panoramas: 0,
                aerials: 0,
                total: 0,
            };
            rows.push(lastRow);
        }

        lastRow.total += 1;
        total.total += 1;

        switch (row.type) {
            case "IMAGE":
                lastRow.images += 1;
                total.images += 1;
                break;
            case "VIDEO":
                lastRow.videos += 1;
                total.videos += 1;
                break;
            case "PANORAMA":
                lastRow.panoramas += 1;
                total.panoramas += 1;
                break;
            case "AERIAL":
                lastRow.aerials += 1;
                total.aerials += 1;
                break;
            default:
                break;
        }
    });

    return { rows, total };
}

function isCanCorrect(ratio, date) {
    if (ratio >= 100) {
        return false;
    }

    const dataFrom = moment(date).format("YYYY-MM-DD");
    return (dataFrom >= correctDateFrom);
}

function parseDates(date) {
    const matches = date.match(/^([\d]{8})(.{1})([\d]+)/);
    if (!matches) {
        const now = moment().format("YYYY-MM-DD");
        return { dateFrom: now, dateTo: now };
    }

    const m = moment(matches[1], "YYYYMMDD");
    const dateSet = m.format("YYYY-MM-DD");
    const cmd = matches[2];
    const days = matches[3];


    let dateFrom;
    let dateTo;
    if (cmd === "-") {
        dateTo = dateSet;
        dateFrom = m.subtract(days, "days").format("YYYY-MM-DD");
    } else {
        dateFrom = dateSet;
        dateTo = m.add(days, "days").format("YYYY-MM-DD");
    }

    return { dateFrom, dateTo };
}

module.exports = {
    common,
    content,
};
