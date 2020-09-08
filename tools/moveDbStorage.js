// node ./tools/moveDbStorage.js

/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */

const { Content, Sequelize } = require("../models/");

const { Op } = Sequelize;

(async function start() {
    try {
        await main();
        process.exit();
    } catch (e) {
        console.log("error", e);
    }
}());

async function main() {
    const list = await Content.findAll({
        where: {
            src: {
                src: {
                    [Op.like]: "%/storage2/%",
                },
            },
        },
    });

    for (let i = 0; i < list.length; i += 1) {
        const content = list[i];
        const src = {
            src: content.src.src.replace("/storage2/", "/storage/"),
        };
        if (content.src.tmb) {
            src.tmb = content.src.tmb.replace("/storage2/", "/storage/");
        }

        content.src = src;
        await content.save();
    }
}
