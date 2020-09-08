/* eslint-disable no-param-reassign */
const fs = require("fs");
const path = require("path");
const uniqid = require("uniqid");
const _ = require("lodash");

const {
    convertPhoto, convertPanorama, convertVideo, convertAerial, convertTmb, converFromSec, cutVideo, joinVideos,
    convertTimelapse, copyFileForWWW, getTmbFromVideo, convertPanoramaAerial, convertVideoWithParams,
} = require("./contentConverter");
const { asyncFileCopy } = require("./myFs");

const wwwRootDir = "storage";
const rootDir = path.resolve(wwwRootDir);

const typeExt = {
    image: "jpg",
    video: "mov",
    panorama: "jpg",
    aerial: "mov",
    aeropanorama: "jpg",
};

const projectsWithoutLogo = [
    7,
];

const saveCompanyContent = async function saveCompanyContent(companyId, type, file) {
    switch (type) {
        case "video":
            return saveCompanyVideo(companyId, file);
        default:
            return null;
    }
};

const replaceTmbContent = async function replaceTmbContent(companyId, srcImage, file) {
    const { tmb } = srcImage;
    if (tmb) {
        deleteFile(tmb);
    }

    const dir = await getCompanyDir(companyId);
    const wwwDir = getWWWCompanyDir(companyId);
    const uniq = uniqid();

    srcImage.tmb = await copyFileForWWW(file, uniq, dir, wwwDir, "tmb", ".jpg");

    return srcImage;
};

async function saveCompanyVideo(companyId, file) {
    const dir = await getCompanyDir(companyId);
    const wwwDir = getWWWCompanyDir(companyId);
    const uniq = uniqid();

    const out = {};
    let ext = path.extname(file);
    if (!ext) {
        ext = `.${typeExt.video}`;
    }
    out.src = await copyFileForWWW(file, uniq, dir, wwwDir, "src", ext);
    out.tmb = await getTmbFromVideo(file, uniq, dir, wwwDir, "tmb");

    return out;
}

const saveContent = async function saveContent(type, projectId, file, date, config = undefined) {
    const withoutLogo = _.includes(projectsWithoutLogo, Number(projectId));

    switch (type) {
        case "image":
            return saveImage(projectId, file, date);

        case "video":
            return saveVideo(projectId, file, date, withoutLogo);

        case "panorama":
            return savePanorama(projectId, file, date);

        case "aerial":
            return saveAerial(projectId, file, date, config);

        case "timelapse":
            return saveTimelapse(projectId, file);

        case "aeropanorama":
            return savePanoramaAerial(projectId, file);

        case "files":
            return saveFiles(projectId, file);

        default:
            return null;
    }
};

const deleteContent = function deleteContent(image) {
    if (!image) {
        return;
    }

    Object.keys(image).forEach((key) => {
        const file = path.join(path.resolve("."), image[key]);
        if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) {
            return;
        }
        fs.unlinkSync(file);
    });
};

const saveTmb = async function saveTmb(projectID, file, sizes) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertTmb(file, dir, sizes);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
};

const getUploadDir = async function getUploadDir() {
    let dir = getMainUploadDir();

    dir = path.resolve(dir, "added");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
};

const saveToUpload = async function saveToUpload(userId, projectId, lineId, date, type, time, file, data) {
    const dir = await getContentUploadDir(userId, date, projectId, lineId, type);

    let ext = typeExt[type];
    if (!ext) {
        ext = ".unk";
    }

    let fileName;
    if (time) {
        fileName = `${time}.${ext}`;
    } else {
        fileName = `${uniqid()}.${ext}`;
    }

    const resFile = path.join(dir, fileName);
    let isNew = false;
    if (!fs.existsSync(resFile)) {
        await asyncFileCopy(file, resFile);
        fs.chmodSync(resFile, "777");
        isNew = true;
    }

    await asyncSaveCnf(resFile, data);
    return isNew;
};

const saveFromSiteToUpload = async function saveFromSiteToUpload(
    userId, projectId, lineId, date, type, file, fileName,
) {
    const dir = await getContentUploadDir(userId, date, projectId, lineId, type);
    const resFile = path.join(dir, fileName);
    if (!fs.existsSync(resFile)) {
        await asyncFileCopy(file, resFile);
        fs.chmodSync(resFile, "777");
        return true;
    }
    return false;
};

const saveArchiveToUpload = async function saveArchiveToUpload(userId, projectId, date, file) {
    const dir = await getUploadDir();
    let resFile;

    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let fileName = `_${date.replace(/-/g, "")}_${userId}_${projectId}`;
        if (i > 0) {
            fileName += `_${i}`;
        }
        fileName += ".zip";
        resFile = path.join(dir, fileName);
        if (!fs.existsSync(file)) {
            break;
        }

        i += 1;
    }

    if (fs.existsSync(resFile)) {
        fs.unlinkSync(resFile);
    }

    await asyncFileCopy(file, resFile);
    fs.chmodSync(resFile, "777");
};

const markUploadedSet = async function markUploadedSet(userId, projectId, date) {
    const from = await getSetUploadDir(userId, date);

    const dir = await getUploadDir();
    const dirName = `${date.replace(/-/g, "")}_${userId}_${Math.floor(Date.now() / 1000)}`;
    const to = path.join(dir, dirName);

    if (fs.existsSync(from)) {
        fs.renameSync(from, to);
    }
};

const editVideo = async function editVideo(projectId, src, limits) {
    if (!limits || limits.length === 0) {
        return src;
    }

    const fileSrc = path.resolve(path.join(".", src.src));

    const queue = [];
    for (let i = 0; i < limits.length; i += 1) {
        const cutLimits = [
            converFromSec(limits[i][0]),
            converFromSec(limits[i][1]),
        ];
        queue.push(cutVideo(fileSrc, cutLimits, i));
    }
    const files = await Promise.all(queue);
    const fileRes = await joinVideos(files);
    const srcRes = await saveFiles(projectId, {
        src: fileRes,
    });
    await deleteContent(src);

    return srcRes;
};

const saveTvToUpload = async function saveTvToUpload(projectId, userId, date, file, fileName) {
    let dir = await getMainUploadDir();

    dir = path.resolve(dir, "tv");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    const resFile = path.join(dir, `${projectId}.${userId}.${fileName}`);
    if (!fs.existsSync(resFile)) {
        await asyncFileCopy(file, resFile);
        fs.chmodSync(resFile, "777");
        return true;
    }
    return false;
};

const saveVideoToArchive = async function saveVideoToArchive(userId, date, file, fileName) {
    const dir = await getDirForArchive(userId, date);
    const resFile = path.join(dir, fileName);
    if (fs.existsSync(resFile)) {
        fs.unlinkSync(resFile);
    }
    await asyncFileCopy(file, resFile);
    fs.chmodSync(resFile, "777");
    return true;
};

const markUploadedTimelapse = async function markUploadedTimelapse(userId, date) {
    const from = await getDirForArchive(userId, date);
    const dir = await getDirForArchive(userId, date, false, false);
    let to = dir;
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (fs.existsSync(to)) {
            i += 1;
            to = `${dir}.${i}`;
        } else {
            break;
        }
    }

    if (fs.existsSync(from)) {
        fs.renameSync(from, to);
    }
};

async function getDirForArchive(userId, date, isTmp = true, isCreate = true) {
    let dir = await getMainUploadDir();

    dir = path.join(dir, "archive");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    let dirName = "";
    if (isTmp) {
        dirName += "_";
    }
    dirName += `${date.replace(/-/g, "")}_${userId}_archiveOnly`;

    dir = path.join(dir, dirName);
    if (isCreate && !fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

function getMainUploadDir() {
    const dir = path.resolve("upload");

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

async function getSetUploadDir(userId, date) {
    let dir = await getUploadDir();

    const dirName = `_${date.replace(/-/g, "")}_${userId}`;
    dir = path.join(dir, dirName);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

async function getContentUploadDir(userId, date, projectId, lineId, type) {
    let dir = await getSetUploadDir(userId, date);

    const dirName = `${projectId}-${lineId}`;
    dir = path.join(dir, dirName);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    dir = path.join(dir, type);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.chmodSync(dir, "777");
    }

    return dir;
}

async function asyncSaveCnf(file, data) {
    const cnfFile = `${file}.cnf`;

    if (fs.existsSync(cnfFile)) {
        return true;
    }

    return new Promise((resolve, reject) => {
        fs.writeFile(cnfFile, JSON.stringify(data), (err) => {
            if (err) {
                return reject(err);
            }
            fs.chmodSync(cnfFile, "777");
            return resolve(true);
        });
    });
}

async function saveImage(projectID, file, date) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertPhoto(file, dir, date);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

async function saveFiles(projectID, files) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);
    const uniq = uniqid();

    const out = {};
    if (files.src) {
        out.src = await copyFileForWWW(files.src, uniq, dir, wwwDir, "src");
    }

    if (files.tmb) {
        out.tmb = await copyFileForWWW(files.tmb, uniq, dir, wwwDir, "tmb");
    }

    return out;
}

async function saveTimelapse(projectID, file) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertTimelapse(file, dir);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

async function saveAerial(projectID, file, date, config) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertAerial(file, dir, date, config);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

async function saveVideo(projectID, file, date, withoutLogo = false) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertVideo(file, dir, date, withoutLogo);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

async function savePanorama(projectID, file, date) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertPanorama(file, dir, date);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

async function savePanoramaAerial(projectID, file) {
    const dir = await getDir(projectID);
    const wwwDir = getWWWDir(projectID);

    const files = await convertPanoramaAerial(file, dir);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
}

const saveTmbForCompany = async function saveTmbForCompany(companyId, file, sizes) {
    const dir = await getCompanyDir(companyId);
    const wwwDir = getWWWCompanyDir(companyId);

    const files = await convertTmb(file, dir, sizes);

    const out = {};
    Object.keys(files).forEach((sizeName) => {
        const fileName = path.basename(files[sizeName]);
        out[sizeName] = `${wwwDir}/${fileName}`;
    });

    return out;
};

async function saveBgVideoForCompany(companyId, file, params) {
    const dir = await getCompanyDir(companyId);
    const wwwDir = getWWWCompanyDir(companyId);
    const uniq = uniqid();

    const out = {};
    let ext = path.extname(file);
    if (!ext) {
        ext = "mp4";
    }
    const videoName = `${uniq}_src.${ext}`;
    const fileTarget = `${dir}/${videoName}`;

    await convertVideoWithParams(file, fileTarget, params);
    out.src = `${wwwDir}/${videoName}`;

    return out;
}

async function getCompanyDir(companyId) {
    let dirs = [
        "companies",
    ];

    dirs = dirs.concat(getDirsArr(companyId));

    return createDirs(dirs);
}

function getWWWCompanyDir(companyId) {
    let dir = `/${wwwRootDir}/companies`;
    getDirsArr(companyId).forEach((dirName) => {
        dir += `/${dirName}`;
    });

    return dir;
}

async function getDir(projectID) {
    const dirs = getDirsArr(projectID);
    return createDirs(dirs);
}

function getWWWDir(projectID) {
    let dir = `/${wwwRootDir}`;
    getDirsArr(projectID).forEach((dirName) => {
        dir += `/${dirName}`;
    });

    return dir;
}

async function createDirs(dirs) {
    let queue = Promise.resolve(rootDir);
    dirs.forEach((dirName) => {
        queue = queue.then(async (curDir) => {
            const dir = path.join(curDir, dirName);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            return dir;
        });
    });

    return queue;
}

function getDirsArr(id) {
    const date = new Date();

    return [id.toString(), date.getFullYear().toString(), (date.getMonth() + 1).toString()];
}

function deleteFile(filePath) {
    const file = path.join(path.resolve("."), filePath);
    if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) {
        return;
    }
    fs.unlinkSync(file);
}

module.exports = {
    saveContent,
    deleteContent,
    saveTmb,
    getUploadDir,
    saveToUpload,
    saveFromSiteToUpload,
    saveArchiveToUpload,
    markUploadedSet,
    editVideo,
    saveTvToUpload,
    saveVideoToArchive,
    markUploadedTimelapse,
    saveCompanyContent,
    replaceTmbContent,
    saveTmbForCompany,
    saveBgVideoForCompany,
};
