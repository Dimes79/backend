// node ./tools/copyProject.js

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const uniqid = require("uniqid");
const _ = require("lodash");

const {getDir, getWWWDir} = require("../modules/content");
const {copyFileForWWW} = require("../modules/contentConverter");

// const file = path.resolve(__dirname, "../", `.env.${process.env.CROSS_ENV || "default"}`);
// const envFile = fs.readFileSync(file);
// const envConfig = dotenv.parse(envFile);
//
// Object.entries(envConfig)
//     .forEach(([k, val]) => {
//         process.env[k] = val;
//     });

const {Project, Line, Content, Sequelize: {Op}} = require("../models");

const companyCopy = {
    from: 4,
    to: 5
};

(async function start() {
    try {
        await main();
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());

async function main() {
    const projectsFrom = await getProjects(companyCopy.from);
    for (let i = 0; i < projectsFrom.length; i += 1) {
        const projectFrom = projectsFrom[i];
        const projectTo = await copyProject(projectFrom, companyCopy.to);

        const linesFrom = await getLines(projectFrom.id);
        await copyLines(linesFrom, projectTo.id);
    }
    // const {projectFrom, projectTo} = await getProjects();
    // const lines = await getLines(projectFrom.id);
    // console.log({
    //     lines
    // })

    // for (let i = 0; i < lines.length; i += 1) {
    //     const params = lines[i];
    //     // eslint-disable-next-line no-await-in-loop
    //     await copyLines(projectId, params);
    // }
}

async function copyLines(linesFrom, projectId) {
    for (let i = 0; i < linesFrom.length; i += 1) {
        const lineFrom = linesFrom[i];
        const lineTo = await copyLine(lineFrom, projectId);
        await copyContent(lineFrom, lineTo);
    }
}

async function copyContent(lineFrom, lineTo) {
    const dir = await getDir(lineTo.projectId);
    const wwwDir = getWWWDir(lineTo.projectId);

    const contents = await Content.findAll({
        where: {
            lineId: lineFrom.id,
        },
    });

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
            projectId: lineTo.projectId,
            lineId: lineTo.id,
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
        await model.save();
    }
}

async function copyLine(lineFrom, projectId) {
    let lineTo = await Line.findOne({
        where: {
            name: lineFrom.name,
            projectId,
        },
    });
    const data = _.pick(lineFrom, [
        "name",
        "description",
        "gps",
        "agentPlans",
        "orderWeight",
        "tabs",
        "sublines",
        "timelapsePoints",
        "aeroVideoPoints",]);
    if (!lineTo) {
        lineTo = new Line(data);
    } else {
        lineTo.update(data)
    }
    lineTo.projectId = projectId;
    await lineTo.save();

    const dir = await getDir(lineTo.id);
    const wwwDir = getWWWDir(lineTo.id);

    const uniq = uniqid();
    const types = Object.keys(lineFrom.image);
    if (lineTo.image == null || lineFrom.image[types[0]] ===  lineTo.image[types[0]]) {
        const queue = types.reduce((acc, type) => acc.concat(copySRC(lineFrom.image[type], type, dir, wwwDir, uniq)), []);
        const srcList = await Promise.all(queue);

        const src = {};
        types.forEach((type, position) => {
            src[type] = srcList[position];
        });

        lineTo.image = src;
        await lineTo.save();
    }

    return lineTo;
}

async function getLines(projectId) {
    return Line.findAll({
        where: {
            projectId
        }
    });
}

async function copyProject(projectFrom, companyTo) {
    const name = projectFrom.name + "2";
    let projectTo = await Project.findOne({
        where: {
            name: name,
            companies: {
                [Op.contains]: [companyTo],
            }
        },
    });
    const data = _.pick(projectFrom, [
        "description",
        "gps",
        "meta",
        "orderWeight",
        "auditRatio",]);
    if (!projectTo) {
        projectTo = new Project(data)
    } else {
        projectTo.update(data)
    }
    projectTo.name = name;
    projectTo.companies = [companyTo];
    await projectTo.save();



    const dir = await getDir(projectTo.id);
    const wwwDir = getWWWDir(projectTo.id);

    const uniq = uniqid();
    const types = Object.keys(projectFrom.image);
    if (projectFrom.image[types[0]] ===  projectTo.image[types[0]]) {
        const queue = types.reduce((acc, type) => acc.concat(copySRC(projectTo.image[type], type, dir, wwwDir, uniq)), []);
        const srcList = await Promise.all(queue);

        const src = {};
        types.forEach((type, position) => {
            src[type] = srcList[position];
        });

        projectTo.image = src;
        await projectTo.save();
    }

    return projectTo;
}

async function getProjects(companyId) {
    return Project.findAll({
        where: {
            companies: {
                [Op.contains]: [companyId],
            }
        }
    })
}

async function copyLines1(projectId, params) {
    const {line, lineFrom, date} = params;

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

async function getLinesModel(projectId, params) {
    const lineFrom = await Line.find({
        where: {name: params.from},
    });

    let line = await Line.find({
        where: {name: params.name},
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

// async function getProjectId() {
//     let model = await Project.find({
//         where: { name: PROJECT_NAME },
//     });
//     if (!model) {
//         model = new Project({
//             name: PROJECT_NAME,
//             companies: [],
//             description: "",
//         });
//         await model.save();
//     }
//
//     return model.id;
// }
