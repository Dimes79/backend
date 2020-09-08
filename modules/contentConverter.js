const fs = require("fs");
const path = require("path");
const uniqid = require("uniqid");
const gm = require("gm")
    .subClass({ imageMagick: true });
const moment = require("moment");
const ffmpeg = require("fluent-ffmpeg");
const { tmpDir } = require("./tmpDir");

const resizeImage = async function resizeImage(fileSrc, fileTo, size) {
    return new Promise((resolve, reject) => {
        const prc = gm(fileSrc);

        const type = size[2] || ">";
        if (type === "crop") {
            prc.resize(size[0], size[1], "^")
                .gravity("Center")
                .crop(size[0], size[1]);
        } else {
            prc.resize(size[0], size[1], type);
        }

        prc.autoOrient();

        prc.write(fileTo, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const copyFileForWWW = async function copyFileForWWW(fileFrom, uniq, dir, wwwDir, suf, ext = path.extname(fileFrom)) {
    return new Promise((resolve, reject) => {
        const fileName = `${uniq}_${suf}${ext}`;
        const filePath = `${dir}/${fileName}`;
        try {
            fs.copyFile(fileFrom, filePath, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(`${wwwDir}/${fileName}`);
            });
        } catch (e) {
            reject(e);
        }
    });
};

const copyFile = async function copyFile(fileFrom, uniq, dir, suf, ext = path.extname(fileFrom)) {
    return new Promise((resolve, reject) => {
        const fileName = `${uniq}_${suf}${ext}`;
        const filePath = `${dir}/${fileName}`;
        try {
            fs.copyFile(fileFrom, filePath, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(filePath);
            });
        } catch (e) {
            reject(e);
        }
    });
};

const convertTmb = async function convertTmb(fileSrc, dir, sizes) {
    const out = {};

    const uniq = uniqid();

    out.src = path.join(dir, `${uniq}_src.jpg`);
    await resizeImage(fileSrc, out.src, sizes.src);

    if (sizes.tmb) {
        out.tmb = path.join(dir, `${uniq}_tmb.jpg`);
        await resizeImage(out.src, out.tmb, sizes.tmb);
    }

    return out;
};


const convertPhoto = async function convertPhoto(fileSrc, dir, date) {
    const out = {};

    const uniq = uniqid();

    out.src = path.join(dir, `${uniq}_src.jpg`);
    await resizeImage(fileSrc, out.src, [1920, 1080, "crop"]);

    await photoWm(out.src, date);

    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);
    await resizeImage(out.src, out.tmb, [797, 449, "crop"]);

    return out;
};

const convertPanorama = async function convertPanorama(fileSrc, dir, date) {
    const out = {};

    const uniq = uniqid();

    out.raw = await copyFile(fileSrc, uniq, dir, "raw", ".jpg");

    out.src = path.join(dir, `${uniq}_src.jpg`);
    await resizeImage(fileSrc, out.src, [4000, 2000, "crop"]);

    await panoramaWm(out.src, date);

    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);
    await resizeImage(out.src, out.tmb, [797, 449, "crop"]);

    return out;
};

const convertPanoramaAerial = async function convertPanoramaAerial(fileSrc, dir) {
    const out = {};

    const uniq = uniqid();

    out.raw = await copyFile(fileSrc, uniq, dir, "raw", ".jpg");

    out.src = path.join(dir, `${uniq}_src.jpg`);
    await resizeImage(fileSrc, out.src, [4000, 2000, "crop"]);

    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);
    await resizeImage(out.src, out.tmb, [797, 449, "crop"]);

    return out;
};

const convertVideo = async function convertVideo(fileSrc, dir, date, withoutLogo = false) {
    const out = {};
    const uniq = uniqid();
    const dateF = converDateWM(date);
    const wm = path.join(path.resolve("."), "static", "wm.png");

    out.src = path.join(dir, `${uniq}_src.mp4`);
    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);

    return new Promise((resolve, reject) => {
        try {
            const convertor = ffmpeg()
                .input(fileSrc);
            if (!withoutLogo) {
                convertor.input(wm)
                    .addOption("-filter_complex", `[0:v]drawtext=fontfile=OpenSans-Regular.ttf:text='${dateF}'`
                        + ":fontcolor=0xff0050FF:fontsize=45:x=1620:y=20[text]; [text][1:v]overlay[filtered]")
                    .addOption("-map", "[filtered]")
                    .addOption("-map", "0:a?");
            }

            convertor
                .addOption("-codec:v", "libx264")
                .addOption("-codec:a", "copy")
                .output(out.src)
                .on("end", () => resolve(out))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertVideo ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertVideo ${e.message}`));
        }
    }).then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(out.src)
                .addOptions([
                    "-ss 00:00:01",
                    "-vframes 1",
                    "-q:v 2",
                    "-filter:v scale=797:-1",
                ])
                .output(out.tmb)
                .on("end", () => resolve(out))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertVideo(tmb) ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertVideo(tmp) ${e.message}`));
        }
    }));
};

const getTmbFromVideo = async function getTmbFromVideo(fileFrom, uniq, dir, wwwDir, suf) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `${uniq}_${suf}.jpg`;
            const filePath = `${dir}/${fileName}`;

            ffmpeg()
                .input(fileFrom)
                .addOptions([
                    "-ss 00:00:01",
                    "-vframes 1",
                    "-q:v 2",
                    "-filter:v scale=797:-1",
                ])
                .output(filePath)
                .on("end", () => resolve(`${wwwDir}/${fileName}`))
                .on("error", (err) => {
                    reject(new Error(`Cannot TMB(getTmbFromVideo) ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`TMB(getTmbFromVideo) ${e.message}`));
        }
    });
};

const convertTimelapse = async function convertTimelapse(fileSrc, dir) {
    const out = {};
    const uniq = uniqid();

    out.src = path.join(dir, `${uniq}_src.mp4`);
    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);

    return new Promise((resolve, reject) => {
        fs.copyFile(fileSrc, out.src, (err) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    }).then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(out.src)
                .addOptions([
                    "-ss 00:00:01",
                    "-vframes 1",
                    "-q:v 2",
                    "-filter:v scale=797:-1",
                ])
                .output(out.tmb)
                .on("end", () => resolve(out))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertTimelapse(tmb) ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertVideo(tmp) ${e.message}`));
        }
    }));
};

const joinVideos = async function joinVideos(files) {
    const fileOut = path.join(tmpDir, `${uniqid()}res.MP4`);
    let listTxt = "";
    files.forEach((file) => {
        listTxt += `file '${file}'\n`;
    });

    const listFile = path.join(tmpDir, `${uniqid()}list.txt`);

    return new Promise((resolve, reject) => {
        fs.writeFile(listFile, listTxt, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    }).then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(listFile)
                .inputOptions([
                    "-f concat",
                    "-safe 0",
                ])
                .addOption("-c", "copy")
                .output(fileOut)
                .on("end", () => resolve(fileOut))
                .on("error", (err) => {
                    reject(new Error(`Cannot joinVideo ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`joinVideo ${e.message}`));
        }
    }))
        .then(() => deleteFiles(files))
        .then(() => fileOut);
};


const cutVideo = async function cutVideo(fileSrc, limits, position) {
    const fileOut = path.join(tmpDir, `${uniqid() + position}.MP4`);

    const start = converToSec(limits[0]);
    const duration = converToSec(limits[1]) - start;

    return new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(fileSrc)
                .addOption("-ss", start)
                .addOption("-t", duration)
                .output(fileOut)
                // .on("start", (commandLine) => {
                //     console.log(`Spawned Ffmpeg with command: ${commandLine}`);
                // })
                .on("end", () => resolve(fileOut))
                .on("error", (err) => {
                    reject(new Error(`Cannot cutVideo ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`cutVideo ${e.message}`));
        }
    });
};

async function convertAerial(fileSrc, dir, date, config) {
    const uniq = uniqid();

    let promise = Promise.resolve(fileSrc);

    if (config && config.cut) {
        promise = promise.then(() => {
            const queue = [];
            for (let i = 0; i < config.cut.length; i += 1) {
                queue.push(cutVideo(fileSrc, config.cut[i], i));
            }
            return Promise.all(queue);
        });
        promise = promise.then((files) => joinVideos(files));
    }

    const out = {};
    out.src = path.join(dir, `${uniq}_src.mp4`);
    out.tmb = path.join(dir, `${uniq}_tmb.jpg`);

    promise = promise.then((fileFrom) => new Promise((resolve, reject) => {
        const wm = path.join(path.resolve("."), "static", "wmaero.png");
        const dateF = converDateWM(date);

        try {
            ffmpeg()
                .input(fileFrom)
                .input(wm)
                .addOption("-filter_complex", `[0:v]drawtext=fontfile=OpenSans-Regular.ttf:text='${dateF}'`
                    + ":fontcolor=0xff0050FF:fontsize=45:x=1620:y=20[text]; [text][1:v]overlay[filtered]")
                .addOption("-map", "[filtered]")
                .addOption("-codec:v", "libx264")
                .addOption("-b:v", "6000K")
                .output(out.src)
                .on("end", () => resolve(out))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertAerial ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertAerial ${e.message}`));
        }
    }));

    promise = promise.then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(out.src)
                .addOptions([
                    "-ss 00:00:01",
                    "-vframes 1",
                    "-q:v 2",
                    "-filter:v scale=797:-1",
                ])
                .output(out.tmb)
                .on("end", () => resolve(out))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertAerial(tmb) ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertAerial(tmp) ${e.message}`));
        }
    }));

    return promise;
}

async function deleteFiles(files) {
    const queue = [];
    files.forEach((file) => new Promise((resolve, reject) => {
        fs.unlink(file, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    }));

    return Promise.all(queue);
}

const converFromSec = function converFromSec(str) {
    const num = Number.parseInt(str, 10);
    if (typeof num === "undefined") {
        throw new Error(`"wrong number ${str}`);
    }

    const minutes = Math.floor(num / 60);
    const sec = num - minutes * 60;
    return minutes * 100 + sec;
};

function converToSec(str) {
    const num = Number.parseInt(str, 10);
    if (typeof num === "undefined") {
        console.log("wrong number", str);
        process.exit();
    }

    const sec = num % 100;
    const minutes = (num - sec) / 100;


    return sec + minutes * 60;
}

async function panoramaWm(filePath, date) {
    const dateF = converDateWM(date);

    let promise = Promise.resolve();

    promise = promise.then(() => new Promise((resolve, reject) => {
        const wm = path.join(path.resolve("."), "static", "wm360.png");

        const prc = gm(filePath)
            .gravity("Center")
            .composite(wm)
            .geometry("-210+350");

        prc.write(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    }));

    promise = promise.then(() => new Promise((resolve, reject) => {
        const prc = gm(filePath)
            .quality(85);

        prc
            .gravity("Center")
            .fill("#ff0050")
            .fontSize(63)
            .drawText(200, 350, dateF);

        prc.write(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    }));

    return promise;
}


async function photoWm(filePath, date) {
    const dateF = converDateWM(date);
    const wm = path.join(path.resolve("."), "static", "wm.png");

    let promise = Promise.resolve();
    promise = promise.then(() => new Promise((resolve, reject) => {
        const prc = gm(filePath);

        prc
            .composite(wm);

        prc.write(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    }));

    promise = promise.then(() => new Promise((resolve, reject) => {
        const prc = gm(filePath)
            .quality(85);

        prc
            .fill("#ff0050")
            .fontSize(63)
            .drawText(10, 0, dateF, "northeast");

        prc.write(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    }));

    return promise;
}

function convertVideoWithParams(fileSrc, fileTarget, params) {
    const fileTmp = path.join(tmpDir, `${uniqid()}.mp4`);

    return new Promise((resolve, reject) => {
        try {
            const convertor = ffmpeg()
                .input(fileSrc);

            if (params.bitrate) {
                convertor.videoBitrate(`${params.bitrate}k`);
            }

            convertor
                .addOption("-codec:v", "libx264")
                .addOption("-codec:a", "copy");

            const { size } = params;
            if (size) {
                let scaleCmd;
                if (size[0] > size[1]) {
                    scaleCmd = `-2:${size[1]}`;
                } else {
                    scaleCmd = `${size[0]}:-2`;
                }
                convertor.addOption("-vf", `scale=${scaleCmd}`);
            }

            convertor
                .output(fileTmp)
                .on("end", () => resolve())
                .on("error", (err) => {
                    reject(new Error(`Cannot convertVideo(tmp) ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertVideo(tmp) ${e.message}`));
        }
    }).then(() => new Promise((resolve, reject) => {
        try {
            ffmpeg(fileTmp)
                .ffprobe((err, data) => {
                    if (err) {
                        reject(new Error(`Cannot ffprobe ${err.message}`));
                        return;
                    }
                    const { streams } = data;
                    if (!streams || streams.length === 0) {
                        reject(new Error("Cannot ffprobe stream err"));
                        return;
                    }

                    const [stream] = streams;
                    const { width, height } = stream;
                    if (!width || !height) {
                        reject(new Error("Cannot ffprobe stream size err"));
                        return;
                    }

                    resolve([width, height]);
                });
        } catch (e) {
            reject(new Error(`convertVideo ffprobe ${e.message}`));
        }
    })).then(([width, height]) => new Promise((resolve, reject) => {
        const { size } = params;
        try {
            const convertor = ffmpeg(fileTmp);

            convertor
                .addOption("-codec:v", "libx264")
                .addOption("-codec:a", "copy");

            if (size) {
                let cropCmd = "";
                if (width > size[0]) {
                    cropCmd = `${size[0]}:in_h`;
                } else if (height > size[1]) {
                    cropCmd = `in_w:${size[1]}`;
                }

                if (cropCmd) {
                    convertor.addOption("-filter:v", `crop=${cropCmd}`);
                }
            }
            convertor.output(fileTarget)
                .on("end", () => resolve(fileTarget))
                .on("error", (err) => {
                    reject(new Error(`Cannot convertVideo ${err.message}`));
                })
                .run();
        } catch (e) {
            reject(new Error(`convertVideo ${e.message}`));
        }
    }));
}

function converDateWM(date) {
    if (!date) {
        return moment()
            .format("DD/MM/YYYY");
    }
    const t = date.split("-");
    return `${t[2]}/${t[1]}/${t[0]}`;
}

module.exports = {
    convertPhoto,
    convertPanorama,
    convertVideo,
    convertAerial,
    convertTmb,
    convertTimelapse,
    convertPanoramaAerial,
    joinVideos,
    cutVideo,
    converFromSec,
    copyFileForWWW,
    getTmbFromVideo,
    convertVideoWithParams,
};
