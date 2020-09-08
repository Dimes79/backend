const { getDisksInfo } = require("../../modules/diskusage");

const commonInfo = async function commonInfo(req, res, next) {
    const info = {};

    try {
        info.disks = await getDisksInfo();
    } catch (e) {
        next(e);
    }

    res.sendData(info);
};

module.exports = {
    commonInfo,
};
