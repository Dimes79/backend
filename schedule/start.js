const schedule = require("./index");

const args = process.argv;

const jobName = args[2];
if (typeof schedule[jobName] === "undefined") {
    console.log(`Job ${jobName} not found`);
    process.exit();
}

(async function start() {
    try {
        await schedule[jobName].start();
        console.log(`Job ${jobName} done`);
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());
