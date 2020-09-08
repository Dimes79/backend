const multer = require("multer");
const uniqid = require("uniqid");
const fs = require("fs");
const path = require("path");
const { tmpDir } = require("./tmpDir");
const { getFileSize } = require("./myFs");

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, tmpDir);
    },
    filename(req, file, cb) {
        cb(null, `${uniqid()}-${Date.now()}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5000000000,
        fieldSize: 2000000,
    },
});

const uploadByChunks = function uploadByChunks(fieldName) {
    return function middleware(req, res, next) {
        const chunk = Number.parseInt(req.body.chunk, 10);
        if (Number.isNaN(chunk)) {
            return next();
        }
        const { uid, fileName, data } = req.body;
        const chunkTotal = Number.parseInt(req.body.chunkTotal, 10);
        const fileSize = Number.parseInt(req.body.fileSize, 10);
        if (Number.isNaN(chunkTotal) || Number.isNaN(fileSize) || !data || !data.length) {
            return res.sendError("wrongRequest");
        }

        const filePath = path.join(tmpDir, uid);
        const curFilesSize = getFileSize(filePath);
        const curChunksSize = chunkTotal + chunk;
        if (curFilesSize === curChunksSize) {
            return prcChunkDone(res, req, next, {
                fieldName, fileName, curChunksSize, fileSize, filePath,
            });
        }

        return fs.writeFile(filePath, data, { flag: "a", encoding: "binary" }, (err) => {
            if (err) {
                next(err);
            } else {
                prcChunkDone(res, req, next, {
                    fieldName, fileName, curChunksSize, fileSize, filePath,
                });
            }
        });
    };
};

function prcChunkDone(res, req, next, params) {
    if (params.curChunksSize < params.fileSize) {
        return res.status(200).json({
            success: true,
        });
    }

    req[params.fieldName] = {
        path: params.filePath,
        originalname: params.fileName,
    };

    return next();
}

const single = function single(fieldName) {
    return [upload.single(fieldName), uploadByChunks(fieldName)];
};

module.exports = {
    single,
};
