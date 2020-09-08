//  node ./schedule/start.js testJob
const fs = require("fs");
const path = require("path");
const uniqid = require("uniqid");
const locker = require("../../modules/locker");
const { tmpDir } = require("../../modules/tmpDir");

const start = async function start(uid) {
    return locker.acquire("testJob", () => prcStart(uid));
};

async function prcStart(uid) {
    const fileName = `${(new Date()).getTime()}_${uid}_${uniqid()}_`;
    const file = path.join(tmpDir, fileName);

    let p = Promise.resolve();
    p = p.then(() => save(file, 0));
    // for (let i = 0; i < 50; i += 1) {
    //     p = p.then(() => save(file, i));
    // }

    return p;
}

function save(file, position) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const fd = fs.openSync(`${file}.${position}`, "wx");
            fs.writeSync(fd, process.geteuid());
            fs.closeSync(fd);
            resolve();
        }, 0);
    });
}

module.exports = {
    start,
};
