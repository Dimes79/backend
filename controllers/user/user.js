const uuidv4 = require("uuid/v4");
const eValidator = require("email-validator");
const generatePassword = require("password-generator");
const moment = require("moment");
const { intersection } = require("lodash");
const { mailer } = require("../../modules/mailer");
const { User, Sequelize } = require("../../models");

const my = function my(req, res) {
    return res.sendData(req.user);
};

const add = async function add(req, res, next) {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email,
            },
        });
        if (user) {
            res.sendError("alreadyExists", 400);
            return;
        }

        const model = new User(req.body);
        model.companies = [1];
        model.status = "WAITING";
        model.publicKey = uuidv4();
        await model.asyncSetPassword(model.password);
        await model.save();

        const url = `${req.protocol}://${req.get("Host")}/user/api/user/confirmRegistration?`
            + `email=${model.email}&key=${model.publicKey}`;

        const year = new Date().getFullYear();
        await mailer(model.email, "Подтверждение регистрации", "confirmUserAcc", {
            name: model.name,
            email: model.email,
            publicKey: model.publicKey,
            url,
            year,
        });

        res.sendData({});
    } catch (e) {
        if (e instanceof Sequelize.ValidationError) {
            res.sendError("validationError", 400);
        } else {
            next(e);
        }
    }
};

const confirmRegistration = async function confirmRegistration(req, res, next) {
    try {
        const model = await User.findOne({
            where: {
                email: req.query.email,
                publicKey: req.query.key,
                status: "WAITING",
            },
        });
        if (!model) {
            res.redirect("/");
            return;
        }

        model.status = "ACTIVE";
        model.publicKey = null;
        await model.save();
        await userLogin(req, model);

        const year = new Date().getFullYear();
        await mailer(model.email, "Добро пожаловать", "welcomeNewUser", {
            name: model.name,
            email: model.email,
            year,
        });

        res.redirect("/objects");
    } catch (e) {
        next(e);
    }
};

const remindPassword = async function remindPassword(req, res, next) {
    try {
        let email = req.body.email || "";
        email = email.toLowerCase();
        if (email.indexOf("@") === -1) {
            email += "@platforma.tech";
        }

        const model = await User.findOne({
            where: {
                email,
                status: "ACTIVE",
            },
        });
        if (!model) {
            res.sendError("E-mail не найден", 404);
            return;
        }

        if (email.indexOf("@platforma.tech") !== -1) {
            await sendBusinessAccPassword(model);
        } else {
            await sendPassword(model, req);
        }

        res.sendData({});
    } catch (e) {
        next(e);
    }
};

const chgPassword = async function chgPassword(req, res, next) {
    try {
        const model = await User.findOne({
            where: {
                status: "ACTIVE",
                email: req.body.email,
                publicKey: req.body.key,
            },
        });
        if (!model) {
            res.sendError("E-mail не найден", 404);
            return;
        }

        model.publicKey = null;
        model.password = req.body.password;
        await model.asyncSetPassword(model.password);
        await model.save();

        await userLogin(req, model);

        res.sendData({});
    } catch (e) {
        if (e instanceof Sequelize.ValidationError) {
            res.sendError("validationError", 400);
        } else {
            next(e);
        }
    }
};

const regTmpUser = async function regTmpUser(req, res, next) {
    const { user } = req;
    const { email } = req.body;

    if (!user.canCreateTmpUser) {
        res.sendError("permissionError", 400);
        return;
    }

    if (!eValidator.validate(email)) {
        res.sendError("validationEmailError", 400);
        return;
    }

    const name = email.substr(0, email.indexOf("@"));
    const password = generatePassword(8);

    try {
        let model = await User.findOne({
            where: {
                email,
            },
        });
        if (model) {
            res.sendError("alreadyExists", 400);
            return;
        }

        await mailer(email, "Добро пожаловать", "welcomeNewTmpUser", {
            email,
            password,
        });

        const expireAt = moment().add(5, "days");

        model = new User({
            name,
            email,
            companies: user.companies,
            expireAt,
        });
        await model.asyncSetPassword(password);
        await model.save();

        res.sendData({});
    } catch (e) {
        next(e);
    }
};

const regTmpUserV2 = async function regTmpUserV2(req, res, next) {
    const { user } = req;
    const { days, companies } = req.body;
    const { companies: userCompanies } = user;

    let linkCompanies = companies;
    if (req.user.kind !== "SUPER") {
        linkCompanies = intersection(companies, userCompanies);
        if (linkCompanies.length === 0) {
            res.sendError("companiesMiss", 400);
            return;
        }
    }

    const password = generatePassword(8);

    try {
        let model;
        let login;
        let email;
        do {
            login = generatePassword(5);
            email = `${login}@platforma.tech`;
            // eslint-disable-next-line no-await-in-loop
            model = await User.findOne({
                where: {
                    email,
                },
            });
        } while (model);


        model = new User({
            name: login,
            email,
            companies: linkCompanies,
            lifeDays: days,
        });
        await model.asyncSetPassword(password);
        await model.save();

        res.sendData({
            login,
            password,
        });
    } catch (e) {
        next(e);
    }
};

async function userLogin(req, user) {
    return new Promise((resolve, reject) => {
        req.login(user, (err) => {
            if (err) { return reject(err); }
            return resolve();
        });
    });
}

async function sendPassword(model, req) {
    // eslint-disable-next-line no-param-reassign
    model.publicKey = uuidv4();
    await model.save();

    const url = `${req.protocol}://${req.get("Host")}/chgPassword?`
        + `email=${model.email}&key=${model.publicKey}`;

    const year = new Date().getFullYear();
    await mailer(model.email, "Смена пароля", "chgPasswordUserAcc", {
        name: model.name,
        email: model.email,
        publicKey: model.publicKey,
        url,
        year,
    });
}

async function sendBusinessAccPassword(model) {
    await mailer("office@platforma.tech", "Акк забыл пароль", "chgPasswordBusinessAcc", {
        name: model.name,
        email: model.email,
    });
}

module.exports = {
    my,
    add,
    confirmRegistration,
    remindPassword,
    chgPassword,
    regTmpUser,
    regTmpUserV2,
};
