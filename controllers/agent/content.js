const moment = require("moment");
const {
    saveToUpload, saveFromSiteToUpload, saveArchiveToUpload, markUploadedSet, saveTvToUpload, saveVideoToArchive,
    markUploadedTimelapse,
} = require("../../modules/content");
const { getFileSize } = require("../../modules/myFs");

// eslint-disable-next-line no-undef
const { UploadLogs, sequelize } = requireModel();

const add = async function add(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const fileSize = getFileSize(req.file.path);
        if (!fileSize) {
            res.sendError("fileEmpty");
            return;
        }

        const {
            projectId, lineId, date, time, type, gpsLat, gpsLon, magneticAngle, gpsAccuracy, point,
        } = req.body;

        const gps = {
            lat: gpsLat,
            long: gpsLon,
        };

        await saveLog("CONTENT", req.user.id, date, {
            projectId,
            lineId,
            type: type.toUpperCase(),
        }, true);

        const isNew = await saveToUpload(req.user.id, projectId, lineId, date, type, time, req.file.path, {
            gps,
            userId: req.user.id,
            time,
            magneticAngle,
            gpsAccuracy,
            point,
        });

        if (isNew) {
            await saveLog("CONTENT", req.user.id, date, {
                projectId,
                lineId,
                type: type.toUpperCase(),
            });
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const addFromSite = async function addFromSite(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }
        const fileSize = getFileSize(req.file.path);
        if (!fileSize) {
            res.sendError("fileEmpty");
            return;
        }

        const {
            projectId, lineId, date, type,
        } = req.body;

        await saveLog("CONTENT", req.user.id, date, {
            projectId, lineId, type,
        }, true);
        const isNew = await saveFromSiteToUpload(req.user.id, projectId, lineId, date, type, req.file.path,
            req.file.originalname);
        if (isNew) {
            await saveLog("CONTENT", req.user.id, date, {
                projectId, lineId, type,
            });
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const archive = async function archive(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }
        const fileSize = getFileSize(req.file.path);
        if (!fileSize) {
            res.sendError("fileEmpty");
            return;
        }

        const {
            projectId, date,
        } = req.body;

        await saveArchiveToUpload(req.user.id, projectId, date, req.file.path);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const uploadedSet = async function uploadedSet(req, res, next) {
    try {
        const {
            projectId, date,
        } = req.body;

        await markUploadedSet(req.user.id, projectId, date);
        await markLogUploaded("CONTENT", req.user.id, date);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const addTv = async function addTv(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }
        const fileSize = getFileSize(req.file.path);

        if (!fileSize) {
            res.sendError("fileEmpty");
            return;
        }

        const date = moment().format("YYYY-MM-DD");

        const { projects } = req.user;
        let projectId = 0;
        if (projects && projects.length > 0) {
            [projectId] = projects;
        }

        await saveLog("TV", req.user.id, date, undefined, true);
        const isNew = await saveTvToUpload(projectId, req.user.id, date, req.file.path, req.file.originalname);
        if (isNew) {
            await saveLog("TV", req.user.id, date);
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const uploadedTv = async function uploadedTv(req, res, next) {
    try {
        const date = moment().format("YYYY-MM-DD");

        await markLogUploaded("TV", req.user.id, date);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const addTimelapse = async function addTimelapse(req, res, next) {
    try {
        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }
        const fileSize = getFileSize(req.file.path);
        if (!fileSize) {
            res.sendError("fileEmpty");
            return;
        }

        const date = moment().format("YYYY-MM-DD");

        await saveLog("TIMELAPSE", req.user.id, date, undefined, true);
        const isNew = await saveVideoToArchive(req.user.id, date, req.file.path, req.file.originalname);
        if (isNew) {
            await saveLog("TIMELAPSE", req.user.id, date);
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

const uploadedTimelapse = async function uploadedTimelapse(req, res, next) {
    try {
        const date = moment().format("YYYY-MM-DD");

        await markUploadedTimelapse(req.user.id, date);
        await markLogUploaded("TIMELAPSE", req.user.id, date);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

async function markLogUploaded(type, userId, date) {
    const model = await UploadLogs.findOne({
        where: {
            date,
            userId,
            type,
            status: "UPLOADING",
        },
    });

    if (model) {
        model.dateFinUpload = new Date();
        model.status = "UPLOADED";
        await model.save();
    }
}

async function saveLog(typeLog, userId, date, params, isAttempt) {
    let transaction;
    try {
        transaction = await sequelize.transaction({
            autocommit: false,
        });

        await sequelize.query("LOCK TABLE \"UploadLogs\" IN ACCESS EXCLUSIVE MODE", {
            transaction,
        });

        let model = await UploadLogs.findOne({
            where: {
                date,
                userId,
                type: typeLog,
                status: "UPLOADING",
            },
            lock: {
                level: transaction.LOCK.UPDATE,
                of: UploadLogs,
            },
            transaction,
        });

        if (!model) {
            const data = {
                total: 0,
                totalAttempts: 0,
                detail: {},
                detailAttempts: {},
            };

            model = new UploadLogs({
                date,
                userId,
                type: typeLog,
                dateStartUpload: new Date(),
                data,
            });
        }

        const { data } = model;

        if (isAttempt) {
            data.totalAttempts += 1;
            if (params) {
                const { projectId, lineId, type } = params;
                const detailKey = `${projectId},${lineId},${type}`;
                if (!data.detailAttempts[detailKey]) {
                    data.detailAttempts[detailKey] = 0;
                }
                data.detailAttempts[detailKey] += 1;
            }
        } else {
            data.total += 1;
            if (params) {
                const { projectId, lineId, type } = params;
                const detailKey = `${projectId},${lineId},${type}`;
                if (!data.detail[detailKey]) {
                    data.detail[detailKey] = 0;
                }
                data.detail[detailKey] += 1;
            }
        }
        model.data = data;

        await model.save({ transaction });
        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
}

module.exports = {
    add,
    archive,
    addFromSite,
    uploadedSet,
    addTv,
    uploadedTv,
    addTimelapse,
    uploadedTimelapse,
};
