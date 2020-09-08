const MobileDetect = require("mobile-detect");

function isMobile(userAgent) {
    if (!userAgent) {
        return null;
    }
    const md = new MobileDetect(userAgent);
    return md.mobile();
}

module.exports = {
    isMobile,
};
