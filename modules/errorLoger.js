const moment = require("moment");

const { ErrorLog } = require("../models");
const { mailer } = require("./mailer");

const errorLevels = {
    info: "INFO",
    warning: "WARNING",
    error: "ERROR",
    critical: "CRITICAL",
};

const emails = "dimes79@gmail.com";

async function errorLogger(type, message, subject = "Error") {
    try {
        const date = moment().format("YYYY-MM-DD");

        const params = {
            type,
            date,
            message,
        };
        const prevModel = await ErrorLog.findOne({
            where: params,
        });

        let secondsPassed = 0;
        if (prevModel) {
            secondsPassed = moment(new Date()).diff(prevModel.createdAt);
            secondsPassed = Math.round(secondsPassed / 1000);
        }

        if (secondsPassed > 3600) {
            await mailer(emails, subject, "error", {
                message,
            });
        }

        const model = new ErrorLog(params);
        await model.save();
    } catch (e) {
        console.log("error", e);
    }
}

module.exports = {
    errorLogger,
    errorLevels,
};
