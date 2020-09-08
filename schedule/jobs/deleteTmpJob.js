/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */
//  node ./schedule/start.js deleteTmpJob

const path = require("path");
const fs = require("fs");
const moment = require("moment");
const locker = require("../../modules/locker");
const { tmpDir } = require("../../modules/tmpDir");

const maxTimeLife = 1800; // максимальное время жизни в секундах


const start = async function start() {
    const isOk = await locker.lockJob("deleteTmpJob");
    if (isOk) {
        const files = await getFiles();
        await deleteFiles(files);
        await locker.unlockJob("deleteTmpJob");
    }
};

async function deleteFiles(files) {
    const queue = files.reduce((acc, file) => acc.concat(deleteFile(file)), []);
    return Promise.all(queue);
}

async function getFiles() {
    return new Promise((resolve, reject) => {
        fs.readdir(tmpDir, (err, files) => {
            if (err) {
                return reject(err);
            }

            return resolve(files);
        });
    });
}

async function deleteFile(file) {
    const pathFile = path.join(tmpDir, file);
    return new Promise((resolve) => {
        fs.stat(pathFile, (err, stat) => {
            if (err) {
                return resolve(false);
            }

            const date = moment(stat.ctime);
            const time = (Date.now() - date.unix() * 1000) / 1000;

            return resolve(time >= maxTimeLife);
        });
    }).then((isDelete) => {
        if (isDelete) {
            fs.unlinkSync(pathFile);
        }
    });
}

module.exports = {
    start,
};
