const moment = require("moment");

// eslint-disable-next-line no-undef
const { Hit } = requireModel();

async function hitsLogger(userId = null, userAgent) {
    try {
        const date = moment().format("YYYY-MM-DD");

        const params = {
            date,
            userId,
            userAgent,
        };

        let model = await Hit.findOne({
            where: params,
        });

        if (!model) {
            model = new Hit({
                date,
                userId,
                userAgent,
                hits: 0,
            });
        }

        model.hits += 1;
        await model.save();
    } catch (e) {
        console.log("error", e);
    }
}

module.exports = {
    hitsLogger,
};
