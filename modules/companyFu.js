const _ = require("lodash");
const { Project, Company } = require("../models/");

const isPermint = function isPermint(companyId, req, res) {
    const { kind, companies } = req.user;
    if (kind === "SUPER") {
        return true;
    }
    const permit = _.includes(companies, Number.parseInt(companyId, 10));
    if (permit) {
        return true;
    }

    res.permissionDenied();

    return false;
};

const isPermintCompanies = function isPermintCompanies(companiesArr, req, res) {
    const { kind, companies } = req.user;
    if (kind === "SUPER") {
        return true;
    }
    const permit = _.intersection(companies, Number.parseInt(companiesArr, 10));
    if (permit.length !== 0) {
        return true;
    }

    res.permissionDenied();

    return false;
};

const getDefCompanyId = async function getDefCompanyId(req) {
    const { kind } = req.user;
    const companies = (kind === "SUPER")
        ? await getCompanies() : req.user.companies;

    if (!companies || companies.length === 0) {
        return 0;
    }

    return Number.parseInt(companies[0], 10);
};

const isPermintByProject = async function isPermintByProject(projectId, req, res) {
    const { kind, companies } = req.user;

    if (kind === "SUPER") {
        return true;
    }
    const project = await Project.findByPk(projectId);
    if (!project) {
        return false;
    }
    const permit = _.intersection(companies, project.companies).length !== 0;

    if (permit) {
        return true;
    }

    res.permissionDenied();

    return false;
};

async function getCompanies() {
    const rows = await Company.findAll({
        where: {
            status: "ACTIVE",
        },
        order: [
            ["id", "ASC"],
        ],
    });
    return rows.map((company) => company.id);
}

module.exports = {
    isPermint,
    getDefCompanyId,
    isPermintByProject,
    isPermintCompanies,
};
