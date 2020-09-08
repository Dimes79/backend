const fs = require("fs");
const path = require("path");

const tmpDir = getTmpDir();

function getTmpDir() {
    const dir = path.resolve("tmp");

    try {
        const exists = fs.existsSync(dir);
        if (exists) {
            return dir;
        }

        fs.mkdirSync(dir);
    } catch (e) {
        console.log("multer", e);
        process.exit();
    }

    return dir;
}

module.exports = {
    tmpDir,
};
