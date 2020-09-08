/* eslint-disable */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
/* eslint-enable */

const file = path.resolve(__dirname, "../", `.env.${process.env.CROSS_ENV || "default"}`);
const envFile = fs.readFileSync(file);
const envConfig = dotenv.parse(envFile);

Object.entries(envConfig).forEach(([k, val]) => {
    process.env[k] = val;
});

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
