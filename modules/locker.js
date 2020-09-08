const fs = require("fs");
const path = require("path");
const uniqid = require("uniqid");

const cronInit = async function cronInit() {
    const dir = await getLockDir();
    const file = path.join(dir, "cron.lock");
    const uniqKey = uniqid();
    return new Promise((resolve, reject) => {
        fs.writeFile(file, uniqKey, (err) => {
            if (err) {
                return reject(err);
            }
            fs.chmodSync(file, "777");
            return resolve(uniqKey);
        });
    });
};

const cronLockChk = async function cronLockChk(curUniqKey) {
    const dir = await getLockDir();
    const file = path.join(dir, "cron.lock");

    if (!fs.existsSync(file)) {
        return false;
    }

    return new Promise((resolve, reject) => {
        fs.readFile(file, "utf8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data === curUniqKey);
            }
        });

        return [];
    });
};

const lockJob = async function lockJob(jobName) {
    const dir = await getLockDir();
    const file = path.join(dir, `${jobName}.lock`);
    if (fs.existsSync(file)) {
        return false;
    }

    fs.writeFileSync(file, 1);
    fs.chmodSync(file, "777");

    return true;
};

const unlockJob = async function unlockJob(jobName) {
    const dir = await getLockDir();
    const file = path.join(dir, `${jobName}.lock`);
    if (!fs.existsSync(file)) {
        return true;
    }

    fs.unlinkSync(file);

    return true;
};

async function getLockDir() {
    const dir = path.resolve("locks");

    if (!fs.existsSync(dir)) {
        await asyncMkdir(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

function asyncMkdir(dir) {
    return new Promise((resolve, reject) => {
        fs.mkdir(dir, (err) => {
            if (err) {
                return reject(err);
            }
            return resolve(true);
        });
    });
}
module.exports = {
    cronInit,
    cronLockChk,
    lockJob,
    unlockJob,
};
