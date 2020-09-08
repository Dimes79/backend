/* eslint-disable prefer-destructuring,no-await-in-loop,no-continue */
//  node ./schedule/start.js uploadContentJob

const path = require("path");
const fs = require("fs");
const tar = require("tar");
const { Content } = require("../../models");
const { saveContent } = require("../../modules/content");
const { getExif } = require("../../modules/exif");
const { readContentConfig } = require("../../modules/contentConfig");
const locker = require("../../modules/locker");

const types = {
    image: ["image", "i"],
    video: ["video", "v"],
    panorama: ["panorama", "p"],
    aerial: ["aerial", "a"],
};

const uploadDir = path.resolve("./upload/");
const concurrentQueueLength = 1;

const prcStart = async function prcStart() {
    try {
        await crBackups();

        const contentSets = await getSets();
        console.log(`found ${contentSets.length} sets`);
        const contentQueue = await getContentQueue(contentSets);
        console.log(`found ${contentQueue.length} cataloges`);
        await uploadContentSets(contentQueue);

        await clearSetsDirs(contentSets);
    } catch (e) {
        console.log("uploadContentJob", e.message);
    }
};

async function crBackups() {
    return new Promise((resolve, reject) => {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return reject(err);
            }
            let dirs = files.filter((file) => file.match(/^(\d{4})(\d{2})(\d{2})_/));
            dirs = dirs.filter((file) => !file.match(/\./));
            return resolve(dirs);
        });
    }).then((dirs) => {
        const archDirs = [];
        dirs.forEach((dir) => {
            const pathDir = path.join(uploadDir, dir);
            const pathArch = path.join(uploadDir, `${dir}.tar`);
            if (fs.existsSync(pathArch)) {
                return;
            }

            archDirs.push(pathDir);
        });

        let queue = Promise.resolve();

        for (let i = 0; i < archDirs.length; i += 1) {
            const pathDir = archDirs[i];
            queue = queue.then(() => {
                const pathArch = `${archDirs[i]}.tar`;

                return tar.c(
                    {
                        gzip: false,
                        file: pathArch,
                    },
                    [pathDir],
                );
            });
        }


        return queue;
    });
}

async function clearSetsDirs(contentSets) {
    const queue = contentSets.reduce((acc, setDir) => acc.concat(clearSetsDir(setDir)), []);
    return Promise.all(queue);
}

async function clearSetsDir(setDir) {
    const dir = path.join(uploadDir, setDir);
    return readDirAsync(dir)
        .then((dirs) => dirs.map((dirPath) => path.join(dir, dirPath)))
        .then((dirs) => {
            const queue = dirs.reduce((acc, dirPath) => acc.concat(deleteDir(dirPath)), []);
            return Promise.all(queue);
        })
        .then(() => deleteDir(dir));
}

async function uploadContentSets(contentQueue) {
    let queue = Promise.resolve();

    const list = [];
    for (let i = 0; i < contentQueue.length; i += concurrentQueueLength) {
        list.push(contentQueue.slice(i, i + concurrentQueueLength));
    }

    list.forEach((arr) => {
        queue = queue.then(() => {
            const q = arr.reduce((acc, dataSet) => acc.concat(prcContentSet(dataSet)), []);
            return Promise.all(q);
        });
    });

    return queue;
}

async function prcContentSet(dataSet) {
    let queue = Promise.resolve();

    queue = queue.then(() => prcContentQueue(dataSet));
    queue = queue.then(() => deleteDir(dataSet.path));
    queue = queue.catch((e) => console.log("prcContentSet", e.message));

    return queue;
}

async function prcContentQueue(dataSet) {
    let files = await readDirAsync(dataSet.path);
    files = files.filter((file) => file.match(/\.cnf$/) === null);
    files = files.sort();
    files = files.map((file) => path.join(dataSet.path, file));

    let queue = Promise.resolve();
    files.forEach((file) => {
        queue = queue.then(() => uploadFile(dataSet, file));
        queue = queue.then(() => deleteFile(file));
        queue = queue.then(() => deleteFile(`${file}.cnf`));
    });

    return queue;
}

async function deleteDir(dir) {
    return new Promise((resolve, reject) => {
        console.log("delete", dir);
        const exists = fs.existsSync(dir);
        if (exists) {
            fs.rmdir(dir, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

async function deleteFile(file) {
    return new Promise((resolve, reject) => {
        const exists = fs.existsSync(file);
        if (exists) {
            fs.unlink(file, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

async function uploadFile(dataSet, file) {
    try {
        console.log("upload file", file);
        const exif = await getExif(file);
        const data = {
            projectId: dataSet.projectId,
            lineId: dataSet.lineId,
            type: dataSet.type.toUpperCase(),
            date: dataSet.date,
        };

        if (exif) {
            data.gps = exif.gps;
            if (exif.datetime) {
                data.contentCreateDate = exif.datetime;
            }

            if (exif.magneticAngle) {
                data.magneticAngle = Math.round(exif.magneticAngle);
            }
        }

        const config = await readContentConfig(file);
        if (config) {
            if (config.gps) {
                data.gps = config.gps;
            }

            if (config.gpsAccuracy) {
                data.gpsAccuracy = Math.round(config.gpsAccuracy);
            }

            if (config.time) {
                data.contentCreateDate = new Date(config.time * 1000);
            }

            if (config.magneticAngle) {
                data.magneticAngle = Math.round(config.magneticAngle);
            }

            if (config.userId) {
                data.userId = config.userId;
            }
        }

        const src = await saveContent(dataSet.type, dataSet.projectId, file, data.date, config);

        if (!src) {
            throw new Error(`uploadContentJob(SRC) ${file}`);
        }

        data.src = src;

        const model = new Content(data);
        if (config && config.name) {
            model.description = config.name;
        }

        return model.save();
    } catch (e) {
        throw new Error(`uploadContentJob(uploadFile) ${e.message}`);
    }
}

async function readDirAsync(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                return reject(err);
            }

            return resolve(files);
        });

        return [];
    });
}

async function getContentQueue(contentSets) {
    const queue = contentSets.reduce((acc, contentSet) => acc.concat(getContentDirs(contentSet)), []);
    const list = await Promise.all(queue);

    let out = [];
    list.forEach((s) => {
        out = out.concat(s);
    });

    return out;
}

async function getContentDirs(contentSet) {
    const dateP = contentSet.match(/^(\d{4})(\d{2})(\d{2})/);
    const date = `${dateP[1]}-${dateP[2]}-${dateP[3]}`;

    const contentSetDir = path.join(uploadDir, contentSet);
    return readDirAsync(contentSetDir)
        .then((dirs) => {
            const out = [];
            dirs.forEach((dir) => {
                const match = dir.match(/^(\d+)-(\d+)$/);
                if (!match) {
                    return;
                }
                out.push({
                    date,
                    projectId: match[1],
                    lineId: match[2],
                    pathContents: path.join(contentSetDir, dir),
                });
            });
            return out;
        })
        .then((sections) => {
            const queue = sections.reduce((acc, section) => acc.concat(readSectionDir(section)), []);
            return Promise.all(queue);
        })
        .then((sections) => {
            let out = [];
            sections.forEach((s) => {
                out = out.concat(s);
            });

            return out;
        });
}

async function readSectionDir(section) {
    const out = [];
    const dirs = await readDirAsync(section.pathContents);
    dirs.forEach((dir) => {
        const type = findTypeByDirName(dir);

        if (!type) {
            throw new Error(`uploadContentJob(Unk type dir) ${dir}`);
        }

        out.push({
            path: path.join(section.pathContents, dir),
            type,
            ...section,
        });
    });

    return out;
}

function findTypeByDirName(dirName) {
    if (types[dirName] !== undefined) {
        return dirName;
    }

    return undefined;
}

async function getSets() {
    return new Promise((resolve, reject) => {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return reject(err);
            }
            let dirs = files.filter((file) => file.match(/^(\d{4})(\d{2})(\d{2})/));
            dirs = dirs.filter((file) => !file.match(/\./));

            return resolve(dirs);
        });
    });
}

const start = async function start() {
    return locker.acquire("uploadContentJob", prcStart);
};

module.exports = {
    start,
};
