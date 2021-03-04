// node ./tools/total.js

const fs = require("fs");
const moment = require("moment");
const {Content, Sequelize: {Op}} = require("../models");

const months = ["2020-11", "2020-12", "2021-01"];

(async function start() {
    try {
        for (var i = 0; i < months.length; i++) {
            const month = months[i];
            console.log({
                month
            })
            await calcMonth(month);
        }


        console.log("DONE\n");
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());

async function calcMonth(month) {
    const date = moment(month + "-01");
    const dateFrom  = date.toDate();
    const dateTo  = date.add(1, "months").toDate();
    const list = await Content.findAll({
        where: {
            createdAt: {
                [Op.gte]: dateFrom,
                [Op.lt]: dateTo,
            }
        }
    })

    var total = 0;
    for (var i = 0; i < list.length; i++) {
        const elm = list[i];
        const src = elm.src.src;
        total += getSize(src)
        const tmb = elm.src.tmb;
        total += getSize(tmb)
        const raw = elm.src.raw;
        total += getSize(raw)
    }

    const totalGb = total / 1024 / 1024 / 1024;
    const perDayGb = totalGb / 10;

    console.log({
        // total,
        totalGb,
        // perDayGb,
    })

}

function getSize(file) {
    if (!file) return 0

    var stats = fs.statSync("." + file)

    return stats.size;
}
