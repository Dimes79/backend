// node ./schedule/start.js autoHiddenLinesJob

const { Content, Line } = require("../../models");
const locker = require("../../modules/locker");

const start = async function start() {
    const isOk = await locker.lockJob("autoHiddenLinesJob");
    if (isOk) {
        const lines = await getLines();
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            // eslint-disable-next-line no-await-in-loop
            await prcLine(line);
        }
        await locker.unlockJob("autoHiddenLinesJob");
    }
    console.log("DONE");
};

async function prcLine(line) {
    const isExistsContent = await Content.findOne({
        where: {
            lineId: line.id,
        },
    });

    // eslint-disable-next-line no-param-reassign
    line.status = (isExistsContent) ? "ACTIVE" : "HIDDEN";

    await line.save();
}

async function getLines() {
    return Line.findAll({
        order: ["id"],
    });
}

module.exports = {
    start,
};
