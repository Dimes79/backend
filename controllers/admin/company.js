const { pick } = require("lodash");
const { Company } = require("../../models");
const { saveTmbForCompany, deleteContent, saveBgVideoForCompany } = require("../../modules/content");

async function getList(req, res, next) {
    const { limit, page } = req.preparePagination();

    try {
        const { rows, count } = await Company.findAndCountAll({
            where: null,
            order: [["id", "ASC"]],
            offset: (page - 1) * limit,
            limit,
        });
        res.sendData(rows, count);
    } catch (e) {
        next(e);
    }
}

async function add(req, res, next) {
    const { name } = req.body;
    if (name) {
        try {
            let model = await Company.findOne({
                where: { name },
            });
            if (model) {
                return res.status(400)
                    .send("alreadyExists");
            }
            model = new Company(crData(req));
            await model.save();
        } catch (e) {
            return res.status(500)
                .send("api error");
        }
        return getList(req, res, next);
    }
    return res.status(400)
        .send("please specify company name");
}

async function get(req, res) {
    const { modelID: id } = req.params;
    if (id) {
        try {
            const model = await Company.findOne({
                where: { id },
            });
            if (!model) {
                return res.status(404)
                    .send("notFound");
            }
            return res.sendData(model);
        } catch (e) {
            return res.status(500)
                .send("api error");
        }
    }
    return res.status(400)
        .send("please specify company id");
}

async function update(req, res, next) {
    const { modelID } = req.params;
    if (modelID) {
        try {
            const model = await Company.findByPk(modelID);
            if (!model) {
                return res.status(404).send("notFound");
            }
            model.set(crData(req));
            await model.save();
            return get(req, res, next);
        } catch (e) {
            return res.status(500)
                .send("api error");
        }
    }
    return res.status(400)
        .send("please specify company id");
}

async function disable(req, res, next) {
    const { modelID } = req.params;
    if (modelID) {
        try {
            const model = await Company.findByPk(modelID);
            if (model) {
                model.status = "INACTIVE";
                await model.save();
            }
            return getList(req, res, next);
        } catch (e) {
            return res.status(500)
                .send("api error");
        }
    }
    return res.status(400)
        .send("please specify company id");
}

async function remove(req, res, next) {
    const { modelID } = req.params;
    if (modelID) {
        try {
            const model = await Company.findByPk(modelID);
            if (!model) {
                return res.status(404).send("notFound");
            }
            await model.destroy();
            return getList(req, res, next);
        } catch (e) {
            return res.status(500)
                .send("api error");
        }
    }
    return res.status(400)
        .send("please specify company id");
}

async function upload(req, res, next) {
    try {
        const company = await Company.findByPk(req.params.modelID);
        if (!company) {
            res.sendError("notFound");
            return;
        }

        if (!req.file) {
            res.sendError("fileMiss");
            return;
        }

        const oldImage = company.image;

        try {
            company.image = await saveTmbForCompany(company.id, req.file.path, {
                src: [1000, 1000, null],
            });
            company.save();
            res.sendData(company);

            deleteContent(oldImage);
        } catch (e) {
            next(e);
        }
    } catch (e) {
        next(e);
    }
}

async function uploadVideo(req, res, next) {
    try {
        const company = await Company.findByPk(req.params.modelID);
        if (!company) {
            res.sendError("notFound");
            return;
        }

        if (!req.file) {
            res.sendError("fileMiss", 400);
            return;
        }

        const oldVideo = company.video;

        try {
            company.video = await saveBgVideoForCompany(company.id, req.file.path, {
                size: [1280, 720],
                bitrate: 2048,
            });
            company.save();
            res.sendData(company);

            deleteContent(oldVideo);
        } catch (e) {
            next(e);
        }
    } catch (e) {
        next(e);
    }
}

function crData(req) {
    return pick(req.body, ["name", "contents", "status"]);
}

module.exports = {
    getList,
    add,
    get,
    update,
    delete: remove,
    upload,
    uploadVideo,
    disable,
};
