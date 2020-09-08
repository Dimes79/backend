const { CompanyContent, Content } = require("../../models");
const companyFu = require("../../modules/companyFu");
const { singPathForce } = require("../../modules/signUrlFu");

async function get(req, res) {
    const { type, id } = req.query;
    if (!id) {
        res.sendError(null, 400);
        return;
    }

    try {
        let url;
        if (type === "companyContent") {
            url = await getCompanyContentURL(req, res, id);
        } else {
            url = await getContentURL(req, res, id);
        }

        if (url) {
            res.sendData(url);
        }
    } catch (e) {
        res.sendError(e);
    }
}

async function getContentURL(req, res, id) {
    const content = await Content.findByPk(id);
    if (!content) {
        res.status(500)
            .send(null);
        return null;
    }

    const isCompanyPermit = await companyFu.isPermintByProject(content.projectId, req, res);
    if (!isCompanyPermit) {
        return null;
    }

    const { type, src } = content;
    if (!src.src) {
        res.status(400)
            .send(null);
        return null;
    }
    const url = await singPathForce(req.user.id, src.src);

    let pageType;
    switch (type) {
        case "IMAGE":
            pageType = "image";
            break;

        case "VIDEO":
        case "TIMELAPSE":
        case "AERIAL":
            pageType = "video";
            break;

        default:
            pageType = "";
            break;
    }
    if (!pageType) {
        res.status(400)
            .send(null);
        return null;
    }

    return getShareUrl(url, pageType);
}

async function getCompanyContentURL(req, res, id) {
    const content = await CompanyContent.findByPk(id);
    if (!content) {
        res.status(500)
            .send(null);
        return null;
    }

    if (!companyFu.isPermint(content.companyId, req, res)) {
        return null;
    }

    const { src } = content;
    if (!src.src) {
        res.status(400)
            .send(null);
        return null;
    }
    const url = await singPathForce(req.user.id, src.src);

    return getShareUrl(url, "video");
}

function getShareUrl(url, type) {
    return `/share/${type}?source=${url}`;
}

module.exports = {
    get,
};
