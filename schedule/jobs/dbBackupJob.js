//  node ./schedule/start.js dbBackupJob

if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line global-require
    require("dotenv").config();
}

const path = require("path");
const fs = require("fs");
const moment = require("moment");
const { spawn } = require("child_process");
const { tmpDir } = require("../../modules/tmpDir");
const { asyncMove } = require("../../modules/myFs");

const locker = require("../../modules/locker");

const start = async function start() {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    try {
        const isOk = await locker.lockJob("dbBackup");
        if (isOk) {
            await main();
            await locker.unlockJob("dbBackup");
        }
    } catch (e) {
        console.log("dbBackup", e.message);
    }
};

async function main() {
    const backupFile = await crBackup();
    const dir = await getDir();

    const fileName = path.basename(backupFile);
    const fileNew = path.join(dir, fileName);
    await asyncMove(backupFile, fileNew);
}

async function getDir() {
    let dir = path.resolve("upload");

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    dir = path.join(dir, "dbBackups");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

async function crBackup() {
    const fileName = `db-${moment().format("YYYYMMDDHHmm")}.bcp`;
    const file = path.join(tmpDir, fileName);
    return new Promise((resolve, reject) => {
        const args = [
            process.env.DATABASE_URL,
            `>${file}`,
        ];

        const prc = spawn("pg_dump", args, {
            // stdio: 'inherit',
            shell: true,
        });

        prc.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`);
        });


        prc.stderr.on("end", (data) => {
            console.log(`end: ${data}`);
            resolve(file);
        });

        prc.stderr.on("exit", () => {
            console.log("exit:");
            reject();
        });
    });
}

module.exports = {
    start,
};
