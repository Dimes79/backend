const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const gm = require("gm").subClass({ imageMagick: true });

const { Content, Sequelize } = require("./models");

async function init() {
    console.log("REMAKE_THUMBS");
    const models = await Content.findAll({
        where: {
            type: "TIMELAPSE",
        },
        limit: 100,
    });
    if (models) {
        /* eslint-disable */
        for (const item of models) {
            let { src, tmb } = item.src;
            // if (!tmb) {
                try {
                    const fileName = src.split("_src.mp4");
                    tmb = tmb || `${fileName[0]}_tmb.jpg`;
                    await makeTmb(path.join(__dirname, src), path.join(__dirname, tmb));
                    await resizeTmb(path.join(__dirname, tmb));
                    item.tmb = tmb;
                    await item.update({ src: { src, tmb } });
                    console.log(tmb);
                } catch (e) {
                    console.log(e);
                }
            // }
        }
    }
    process.exit();
}

async function makeTmb(src, tmb) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(src)
            .addOptions([
                "-ss 00:00:01",
                "-vframes 1",
                "-q:v 2",
                "-filter:v scale=797:-1",
            ])
            .output(tmb)
            .on("end", () => resolve(tmb))
            .on("error", (err) => {
                reject(new Error(`Cannot convertVideo(tmb) ${err.message}`));
            })
            .run();
    });
}

function resizeTmb(fileName) {
    const size = [797, 448];
    const prc = gm(fileName);
    return new Promise((resolve, reject) => {
        prc.resize(size[0], size[1], "^").gravity("Center").crop(size[0], size[1]);

        prc.autoOrient();

        prc.write(fileName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(fileName);
            }
        });
    });
}

init();
