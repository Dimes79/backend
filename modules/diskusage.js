const fs = require("fs");
const path = require("path");
const diskusage = require("diskusage");

const config = readConfig();

const getDisksInfo = function getDisksInfo() {
    const queue = config.reduce((acc, row) => acc.concat(readDiskInfo(row)), []);
    return Promise.all(queue);
};

async function readDiskInfo(disk) {
    return new Promise(((resolve, reject) => {
        diskusage.check(disk.path, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    title: disk.title,
                    minFreeSpace: disk.minFreeSpace,
                    info,
                });
            }
        });
    }));
}

function readConfig() {
    const fileName = (process.env.NODE_ENV === "production") ? "diskusage.config.json" : "diskusage.devconfig.json";
    const fileConfig = path.resolve(__dirname, "./../", fileName);
    if (!fs.existsSync(fileConfig)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(fileConfig, "utf8"));
}

module.exports = {
    getDisksInfo,
};
