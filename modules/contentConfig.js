const fs = require("fs");

const readContentConfig = async function readContentConfig(file) {
    const fileCnf = `${file}.cnf`;
    if (!fs.existsSync(fileCnf)) {
        return null;
    }

    try {
        const data = await readFile(fileCnf);
        const config = JSON.parse(data);

        if (typeof config.cut !== "undefined") {
            const cuts = config.cut.split(",");
            config.cut = cuts.map(elm => elm.split(":"));
        }

        return config;
    } catch (e) {
        throw new Error(`readContentConfig ${e.message}`);
    }
};

const saveContentConfig = async function saveContentConfig(file, data) {
    const cnfFileTmp = `${file}.cnf.tmp`;
    const cnfFile = `${file}.cnf`;

    if (fs.existsSync(cnfFile)) {
        return true;
    }

    return new Promise((resolve, reject) => {
        fs.writeFile(cnfFileTmp, JSON.stringify(data), (err) => {
            if (err) {
                return reject(err);
            }
            fs.chmodSync(cnfFileTmp, "777");
            return resolve(true);
        });
    }).then(() => new Promise((resolve, reject) => {
        fs.rename(cnfFileTmp, cnfFile, (err) => {
            if (err) {
                return reject(err);
            }
            return resolve(true);
        });
    }));
};

const deleteContentConfig = function deleteContentConfig(file) {
    const cnfFile = `${file}.cnf`;
    if (!fs.existsSync(cnfFile)) {
        return true;
    }

    return new Promise((resolve, reject) => {
        fs.unlink(cnfFile, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

async function readFile(fileCnf) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileCnf, "utf8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });

        return [];
    });
}

module.exports = {
    readContentConfig,
    saveContentConfig,
    deleteContentConfig,
};
