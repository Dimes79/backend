const fs = require("fs");
const { ncp } = require("ncp");

ncp.limit = 16;

const cpDir = function cpDir(from, to) {
    return new Promise((resolve, reject) => {
        ncp(from, to, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const getFileSize = function getFileSize(file) {
    if (!fs.existsSync(file)) {
        return null;
    }

    const stats = fs.statSync(file);
    return stats.size;
};

const asyncFileCopy = async function asyncFileCopy(from, to) {
    return new Promise((resolve, reject) => {
        const tmpFile = `${to}.tmp___`;
        fs.copyFile(from, tmpFile, (err) => {
            if (err) {
                return reject(err);
            }
            try {
                fs.renameSync(tmpFile, to);
                return resolve(true);
            } catch (e) {
                return reject(e);
            }
        });
    });
};

const asyncMove = async function asyncMove(from, to) {
    await asyncFileCopy(from, to);
    return new Promise((resolve, reject) => {
        fs.unlink(from, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
};

module.exports = {
    getFileSize,
    asyncFileCopy,
    asyncMove,
    cpDir,
};
