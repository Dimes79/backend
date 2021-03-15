const fs = require("fs");
const path = require("path");
const checkDiskSpace = require("check-disk-space");

const config = readConfig();

const getDisksInfo = function getDisksInfo() {
    const queue = config.reduce((acc, row) => acc.concat(readDiskInfo(row)), []);
    return Promise.all(queue);
};

async function readDiskInfo(disk) {
    return checkDiskSpace(disk.path).then((diskSpace) => {
        return {
            title: disk.title,
            minFreeSpace: disk.minFreeSpace,
            info: {
                available: diskSpace.free,
                free: diskSpace.free,
                total: diskSpace.size,
            },
        };
    });
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
