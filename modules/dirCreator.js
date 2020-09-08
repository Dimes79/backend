const fs = require("fs");
const path = require("path");

const dirs = [
    "storage", "locks", "static", "stream", "promo",
    "upload", "upload/tvContents", "upload/contents",
];

function start() {
    dirs.forEach((dirName) => {
        const dir = path.resolve(dirName);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            fs.chmodSync(dir, "777");
        }
    });
}

module.exports = {
    start,
};
