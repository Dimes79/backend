// Вермя на сервер GMT = MSK - 3

const index = require("node-schedule");

const locker = require("../modules/locker");
const restoreGpsJob = require("./jobs/restoreGpsJob");
const deleteTmpJob = require("./jobs/deleteTmpJob");
const saveContentsJob = require("./jobs/saveContentsJob");
const dbBackupJob = require("./jobs/dbBackupJob");
const checkSystemJob = require("./jobs/checkSystemJob");
const deleteTmpUsersJob = require("./jobs/deleteTmpUsersJob");
const correctGPSJob = require("./jobs/correctGPSJob");
const mergeVideosJob = require("./jobs/mergeVideosJob");
const autoHiddenLinesJob = require("./jobs/autoHiddenLinesJob");

// const deleteContentJob = require("./jobs/deleteContentJob");
// const testJob = require("./jobs/testJob");

const start = async function start() {
    const uniqKey = await locker.cronInit();
    console.log(`schedule start key = ${uniqKey}`);

    index.scheduleJob("0 * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await restoreGpsJob.start();
            }
        } catch (e) {
            console.log("restoreGpsJob error", e.message);
        }
    });

    index.scheduleJob("* * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await deleteTmpJob.start();
            }
        } catch (e) {
            console.log("deleteTmpJob error", e.message);
        }
    });

    index.scheduleJob("* * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await saveContentsJob.start();
            }
        } catch (e) {
            console.log("saveContentsJob error", e.message);
        }
    });

    index.scheduleJob("0 */3 * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await dbBackupJob.start();
            }
        } catch (e) {
            console.log("dbBackupJob error", e.message);
        }
    });

    index.scheduleJob("0 * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await checkSystemJob.start();
            }
        } catch (e) {
            console.log("checkSystemJob error", e.message);
        }
    });

    index.scheduleJob("* * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await deleteTmpUsersJob.start();
            }
        } catch (e) {
            console.log("deleteTmpUsersJob error", e.message);
        }
    });

    index.scheduleJob("0 * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await correctGPSJob.start();
            }
        } catch (e) {
            console.log("correctGPSJob error", e.message);
        }
    });

    index.scheduleJob("0 0 * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await mergeVideosJob.start();
            }
        } catch (e) {
            console.log("mergeVideosJob error", e.message);
        }
    });

    index.scheduleJob("0 * * * *", async () => {
        try {
            const isCron = await locker.cronLockChk(uniqKey);
            if (isCron) {
                await autoHiddenLinesJob.start();
            }
        } catch (e) {
            console.log("autoHiddenLinesJob error", e.message);
        }
    });
};

module.exports = {
    start,

    restoreGpsJob,
    deleteTmpJob,
    saveContentsJob,
    dbBackupJob,
    checkSystemJob,
    deleteTmpUsersJob,
    correctGPSJob,
    mergeVideosJob,
    autoHiddenLinesJob,

    // deleteContentJob,
    // uploadContentJob,
    // testJob,
    // streamConverterJob,
};
