// node ./tools/crPromoCompany.js

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const uniqid = require("uniqid");

const { getDir, getWWWDir } = require("../modules/content");
const { copyFileForWWW } = require("../modules/contentConverter");

const file = path.resolve(__dirname, "../", `.env.${process.env.CROSS_ENV || "default"}`);
const envFile = fs.readFileSync(file);
const envConfig = dotenv.parse(envFile);

Object.entries(envConfig)
    .forEach(([k, val]) => {
        process.env[k] = val;
    });

const { Project, Line, Content } = require("../models");

const PROJECT_NAME = "Платформа промо";
const linesParams = [
    {
        from: "УПГТ",
        name: "Компрессорная станция",
        date: "2019-03-01",
    },
    {
        from: "M11 - Ручьи",
        name: "Трубопровод",
        date: "2019-03-01",
    },
    {
        from: "Пятый участок Ачимовских отложений",
        name: "Газовое месторождение",
        date: "2019-09-01",
    },
];


(async function start() {
    try {
        await main();
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());

async function main() {
    const projectId = await getProjectId();
    const lines = await getLines(projectId);

    for (let i = 0; i < lines.length; i += 1) {
        const params = lines[i];
        // eslint-disable-next-line no-await-in-loop
        await copyLines(projectId, params);
    }
}

async function copyLines(projectId, params) {
    const { line, lineFrom, date } = params;

    const contents = await Content.findAll({
        where: {
            lineId: lineFrom.id,
            date,
        },
    });

    if (!contents.length) {
        console.log(`contents for ${lineFrom.name} not found!`);
        return;
    }

    const dir = await getDir(projectId);
    const wwwDir = getWWWDir(projectId);

    for (let i = 0; i < contents.length; i += 1) {
        const uniq = uniqid();
        const content = contents[i];

        const types = Object.keys(content.src);
        const queue = types.reduce((acc, type) => acc.concat(copySRC(content.src[type], type, dir, wwwDir, uniq)), []);
        // eslint-disable-next-line no-await-in-loop
        const srcList = await Promise.all(queue);

        const src = {};
        types.forEach((type, position) => {
            src[type] = srcList[position];
        });

        const model = new Content({
            projectId,
            lineId: line.id,
            src,

            type: content.type,
            userId: content.userId,
            pointId: content.pointId,
            date: content.date,
            gps: content.gps,
            magneticAngle: content.magneticAngle,
            gpsAccuracy: content.gpsAccuracy,
            meta: content.meta,
            sublineId: content.sublineId,
        });

        // eslint-disable-next-line no-await-in-loop
        await model.save();
    }
}

async function copySRC(src, type, dir, wwwDir, uniq) {
    const fileFrom = path.join(".", src);
    if (!fs.existsSync(fileFrom)) {
        return null;
    }

    return copyFileForWWW(fileFrom, uniq, dir, wwwDir, type);
}

async function getLines(projectId) {
    const lines = [];
    for (let i = 0; i < linesParams.length; i += 1) {
        const params = linesParams[i];
        // eslint-disable-next-line no-await-in-loop
        const { line, lineFrom } = await getLinesModel(projectId, params);
        if (!lineFrom) {
            console.log(`line ${params.from} not found`);
            // eslint-disable-next-line no-continue
            continue;
        }
        lines.push({
            line,
            lineFrom,
            date: params.date,
        });
    }

    return lines;
}

async function getLinesModel(projectId, params) {
    const lineFrom = await Line.find({
        where: { name: params.from },
    });

    let line = await Line.find({
        where: { name: params.name },
    });
    if (!line) {
        line = new Line({
            name: params.name,
            projectId,
            description: "",
        });
        await line.save();
    }

    return {
        line,
        lineFrom,
    };
}

async function getProjectId() {
    let model = await Project.find({
        where: { name: PROJECT_NAME },
    });
    if (!model) {
        model = new Project({
            name: PROJECT_NAME,
            companies: [],
            description: "",
        });
        await model.save();
    }

    return model.id;
}
