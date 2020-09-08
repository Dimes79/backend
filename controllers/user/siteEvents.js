const { SiteEvent } = require("../../models");

const add = async function getList(req, res) {
    const { event, meta, source } = req.body;
    const userId = (req.user) ? req.user.id : 0;
    const userAgent = req.headers["user-agent"];

    if (!event) {
        res.sendError(null, 400);
        return;
    }

    try {
        const model = new SiteEvent({
            event,
            meta,
            userId,
            userAgent,
            source: (source) ? source.toUpperCase() : undefined,
        });
        await model.save();
        res.sendData({});
    } catch (e) {
        res.sendError(e);
    }
};

module.exports = {
    add,
};
