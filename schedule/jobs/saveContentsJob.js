/* eslint-disable no-await-in-loop,no-continue */
//  node ./schedule/start.js saveContentsJob

const path = require("path");
const fs = require("fs");
const moment = require("moment");

const { Content, CompanyContent, Line } = require("../../models");
const { saveContent, saveCompanyContent } = require("../../modules/content");
const locker = require("../../modules/locker");

const uploadDir = path.resolve("./upload/contents/");
const tvDir = path.resolve("./upload/tvContents/");

const lines = {};

const start = async function prcStart() {
    const isOk = await locker.lockJob("saveContentsJob");
    try {
        if (isOk) {
            await saveTvFiles();
            const cnfFiles = await getCnfFiles();
            console.log(`found ${cnfFiles.length} files`);
            await prcCnfFiles(cnfFiles);
        }
    } catch (e) {
        console.log("saveContentsJob", e.message);
    }

    await locker.unlockJob("saveContentsJob");
};

async function saveTvFiles() {
    const files = await getTvFiles();
    console.log(`found ${files.length} tv files`);
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];

        const matches = file.match(/tv_(\d+)_(\d{4})(\d{2})(\d{2})[^\d]+/);
        if (!matches) {
            continue;
        }

        const companyId = Number.parseInt(matches[1], 10);
        const date = `${matches[2]}-${matches[3]}-${matches[4]}`;
        const dateF = moment(date).locale("ru_RU").format("LL");
        const description = dateF.substr(0, dateF.length - 8);

        const data = {
            companyId,
            section: "STREAM",
            type: "VIDEO",
            date,
            description,
        };

        const src = await saveCompanyContent(data.companyId, "video", file);

        if (!src) {
            console.log("TV unkError!");
            continue;
        }

        data.src = src;

        const model = new CompanyContent(data);
        await model.save();
        fs.unlinkSync(file);
    }
}

async function prcCnfFiles(files) {
    let queue = Promise.resolve();
    files.forEach((cnfFile) => {
        queue = queue.then(() => saveFiles(cnfFile));
        queue = queue.catch((err) => {
            console.log("prcCnfFiles err", err.message);
        });
    });

    return queue;
}

async function saveFiles(cnfFile) {
    const cnf = await readConfig(cnfFile);

    cnf.gps = await correctGps(cnf.gps, cnf.lineId);

    const data = {
        projectId: cnf.projectId,
        lineId: cnf.lineId,
        type: cnf.type.toUpperCase(),
        date: cnf.date,
        gps: cnf.gps,
    };
    if (cnf.contentCreateDate) {
        data.contentCreateDate = cnf.contentCreateDate;
    }
    if (cnf.magneticAngle) {
        data.magneticAngle = Math.round(cnf.magneticAngle);
    }
    if (cnf.gpsAccuracy) {
        data.gpsAccuracy = Math.round(cnf.gpsAccuracy);
    }
    if (cnf.userId) {
        data.userId = cnf.userId;
    }
    if (cnf.name) {
        data.description = cnf.name;
    }
    if (cnf.point) {
        data.pointId = cnf.point;
    }

    // if (cnf.type.toUpperCase() === "AERIAL") {
    //     data.status = "WAITING";
    // }

    try {
        data.src = await saveContent("files", cnf.projectId, cnf.files);

        const model = new Content(data);
        await model.save();
        const filesForDelete = [cnfFile];
        Object.keys(cnf.files).forEach((k) => filesForDelete.push(cnf.files[k]));

        await deleteFiles(filesForDelete);
    } catch (e) {
        throw new Error(`saveFiles ${e.message}`);
    }
}

async function correctGps(gps, lineId) {
    if (!lineId) {
        return gps;
    }

    if (gps && gps.lat > 0 && gps.long > 0) {
        return gps;
    }

    const line = await getLine(lineId);
    if (!line) {
        return gps;
    }

    return line.gps;
}

async function getLine(lineId) {
    if (!lines[lineId]) {
        lines[lineId] = await Line.findById(lineId);
    }

    return lines[lineId];
}

async function deleteFiles(files) {
    const queue = files.reduce((acc, file) => acc.concat(deleteFile(file)), []);
    return Promise.all(queue);
}

async function deleteFile(file) {
    return new Promise((resolve, reject) => {
        const exists = fs.existsSync(file);
        if (exists) {
            fs.unlink(file, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

async function readConfig(cnfFile) {
    return new Promise((resolve, reject) => {
        fs.readFile(cnfFile, "utf8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const config = parseCnf(data);
                    resolve(config);
                } catch (e) {
                    reject(new Error(`readConfig ${e.message}`));
                }
            }
        });
    });
}

async function parseCnf(data) {
    const config = JSON.parse(data);

    Object.keys(config.files).forEach((k) => {
        config.files[k] = path.join(uploadDir, config.files[k]);
    });

    return config;
}

async function getCnfFiles() {
    return new Promise((resolve, reject) => {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return reject(err);
            }
            const cnfFiles = [];
            files.forEach((file) => {
                if (file.match(/\.cnf$/)) {
                    cnfFiles.push(path.join(uploadDir, file));
                }
            });
            return resolve(cnfFiles);
        });
    });
}

async function getTvFiles() {
    return new Promise((resolve, reject) => {
        fs.readdir(tvDir, (err, files) => {
            if (err) {
                return reject(err);
            }
            const tvFiles = [];
            files.forEach((file) => {
                if (file.match(/^tv_/)) {
                    tvFiles.push(path.join(tvDir, file));
                }
            });

            return resolve(tvFiles);
        });
    });
}

module.exports = {
    start,
};
