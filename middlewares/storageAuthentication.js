const { intersection } = require("lodash");
const { Project } = require("../models");
const { isSigned } = require("../modules/signUrlFu");

async function checkAuth(req, res, next) {
    try {
        const isPermitted = await checkIsPermitted(req);
        if (!isPermitted) {
            res.status(401).send(null);
        } else {
            next();
        }
    } catch (e) {
        next(e);
    }
}

async function checkIsPermitted(req) {
    // Авторизация по ключу
    const { sk } = req.query;
    if (sk) {
        return checkByKey(req, sk);
    }

    // Основной способо авторизации
    if (!req.isAuthenticated()) {
        return false;
    }

    const { url } = req;
    const { kind, companies } = req.user;

    if (kind === "SUPER") {
        return true;
    }

    const urlCompanies = await getCompanies(url);

    return intersection(companies, urlCompanies).length !== 0;
}

async function checkByKey(req, sk) {
    const path = req.baseUrl + req.path;
    return isSigned(sk, path);
}

async function getCompanies(url) {
    if (url.indexOf("companies") !== -1) {
        return getCompaniesFromUrl(url);
    }
    return getCompaniesFromProject(url);
}

function getCompaniesFromUrl(url) {
    const pathArr = url.split("/");
    if (pathArr.length < 3) {
        return undefined;
    }

    const cpmpanyId = parseInt(pathArr[2], 10);

    return [cpmpanyId];
}

async function getCompaniesFromProject(url) {
    const pathArr = url.split("/");
    if (pathArr.length < 2) {
        return undefined;
    }

    const projectId = parseInt(pathArr[1], 10);

    const project = await Project.findByPk(projectId);
    if (!project) {
        return undefined;
    }

    return project.companies;
}

module.exports = checkAuth;
