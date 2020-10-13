/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */
// node ./schedule/start.js mergeVideosJob

const _ = require("lodash");
const moment = require("moment");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const uniqid = require("uniqid");
const fs = require("fs");
const {tmpDir} = require("../../modules/tmpDir");
const {Content, Line} = require("../../models/");
const locker = require("../../modules/locker");
const {
    getDir, getWWWDir, deleteContent,
} = require("../../modules/content");
const {copyFileForWWW} = require("../../modules/contentConverter");

const maxDays = 90; // На сколько дней назад следим за сетами

const start = async function start() {
    const isOk = await locker.lockJob("mergeVideosJob");
    if (isOk) {
        const days = getDays();
        const lines = await getLines();
        for (let i = 0; i < days.length; i += 1) {
            const date = days[i];
            const contentSets = await getContentSets(date, lines);
            console.log({
                date,
                "found": contentSets.length,
            });
            await prcContentSets(contentSets);
        }

        await locker.unlockJob("mergeVideosJob");
    }
};

async function prcContentSets(contentSets) {
    for (let i = 0; i < contentSets.length; i += 1) {
        const contentSet = contentSets[i];
        const resFile = await mergeContentSets(contentSet);
        await saveVideo(contentSet[0], resFile);
        await deleteContentSet(contentSet);
    }
}

async function deleteContentSet(contents) {
    for (let i = 0; i < contents.length; i += 1) {
        const model = contents[i];
        deleteContent(model.src);
        await model.destroy();
    }
}

async function saveVideo(tmplContent, resFile) {
    const tmbSrc = path.join(path.resolve("."), tmplContent.src.tmb);
    const projectId = tmplContent.projectId;
    const dir = await getDir(projectId);
    const wwwDir = getWWWDir(projectId);
    const uniq = uniqid();
    const contentSrc = {};
    contentSrc.src = await copyFileForWWW(resFile, uniq, dir, wwwDir, "src");
    contentSrc.tmb = await copyFileForWWW(tmbSrc, uniq, dir, wwwDir, "tmb");

    const data = _.pick(tmplContent, ["projectId", "lineId", "type", "date", "gps", "description", "magneticAngle", "gpsAccuracy",
        "status", "contentCreateDate", "pointId", "contents", "meta", "sublineId", "timelapsePointId",
        "aeroVideoPointId", "isFirst"]);
    data.src = contentSrc;

    const model = new Content(data);
    await model.save();
    console.log({
        projectId: model.projectId,
        lineId: model.lineId,
        date: model.date,
        src: model.src,
    });
}

async function mergeContentSets(contents) {
    if (contents.length < 2) {
        return;
    }
    const files = contents.reduce((acc, content) => acc.concat(path.join(path.resolve("."), content.src.src)), []);
    return joinVideos(files);
}

async function joinVideos(files) {
    const fileOut = path.join(tmpDir, `${uniqid()}res.MP4`);
    let listTxt = "";
    files.forEach((file) => {
        listTxt += `file '${file}'\n`;
    });

    const listFile = path.join(tmpDir, `${uniqid()}list.txt`);

    return new Promise((resolve, reject) => {
        fs.writeFile(listFile, listTxt, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    }).then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg()
                // .on('start', function(commandLine) {
                //     console.log('Spawned Ffmpeg with command: ' + commandLine);
                // })
                .input(listFile)
                .inputOptions([
                    "-f concat",
                    "-safe 0",
                ])
                .addOption("-c", "copy")
                .output(fileOut)
                .on("end", () => resolve(fileOut))
                .on("error", (err) => {
                    reject(new Error(`Cannot joinVideo ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`joinVideo ${e.message}`));
        }
    }))
        .then(() => fileOut);
}

async function getContentSets(date, lines) {
    const contentSets = [];
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];

        const contents = await Content.findAll({
            where: {
                status: "ACTIVE",
                type: "AERIAL",
                lineId: line.id,
                date,
            },
        });
        if (contents.length > 1) {
            contentSets.push(contents);
        }
    }
    return contentSets;
}

function getLines() {
    return Line.findAll({
        where: {
            status: "ACTIVE",
            mergeAero: true,
        },
    });
}

function getDays() {
    const days = [];
    for (var i = 0; i < maxDays; i++) {
        const now = moment();
        now.subtract(i, "days");
        days.push(now.format("YYYY-MM-DD"));
    }

    return days;
}

module.exports = {
    start,
};
