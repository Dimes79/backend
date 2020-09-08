/* eslint-disable no-await-in-loop */
//  node ./schedule/start.js checkSystemJob

const locker = require("../../modules/locker");
const { getDisksInfo } = require("../../modules/diskusage");
const { errorLogger, errorLevels } = require("../../modules/errorLoger");

const start = async function start() {
    try {
        const isOk = await locker.lockJob("checkSystem");
        if (isOk) {
            await main();
            await locker.unlockJob("checkSystem");
        }
    } catch (e) {
        console.log("checkSystem", e.message);
    }
};

async function main() {
    await checkDisksSpace();
}

async function checkDisksSpace() {
    const disks = await getDisksInfo();
    for (let i = 0; i < disks.length; i += 1) {
        const disk = disks[i];
        const spaceLeft = Math.round(disk.info.available / 1000000000);
        if (disk.minFreeSpace > spaceLeft) {
            const message = `На диске: "${disk.title}" осталось всего ${spaceLeft}MiB`;
            await errorLogger(errorLevels.critical, message, "На сервере проблема с местом!");
        }
    }
}

module.exports = {
    start,
};
