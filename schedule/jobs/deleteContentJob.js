/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */
//  node ./schedule/start.js deleteContentJob
const { Content } = require("../../models/");
const { deleteContent } = require("../../modules/content");


const start = async function start() {
    try {
        const { rows, count } = await Content.findAndCountAll({
            where: {
                // date: "2018-11-09",
                projectId: 1,
            },
            order: [["id", "DESC"]],
        });

        for (let i = 0; i < rows.length; i += 1) {
            const model = rows[i];

            console.log(`delete ${i + 1} from ${count}`);
            deleteContent(model.src);
            await model.destroy();
        }
    } catch (e) {
        console.log("error", e);
    }
};

module.exports = {
    start,
};
