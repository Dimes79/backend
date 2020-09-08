// const { pick } = require("lodash");
const passport = require("passport");

const denied = {
    success: false,
    error: "AUTH_ERROR",
};

const initialRoutes = {
    USER: "/objects",
    SUPER: "/admin",
    AGENT: "/agent",
    AUDITOR: "/",
    MODERATOR: "/moderator",
};

function loginHelper(req, res, next, user) {
    return req.logIn(user, (loginError) => {
        if (loginError) {
            console.log({ loginError });
            return res.status(401).json(denied);
        }
        return res.status(200).json({
            success: true,
            redirect: initialRoutes[user.kind],
            // payload: pick(user, ["id", "status", "name", "email", "kind", "projects", "meta"]),
        });
    });
}

function login(req, res, next) {
    return passport.authenticate("local", (passportError, user) => {
        if (passportError) {
            console.log({ passportError });
            return res.status(500).json(denied);
        }
        if (!user) {
            return res.status(401).json(denied);
        }
        if (req.isAuthenticated()) {
            req.logout();
        }
        return loginHelper(req, res, next, user);
    })(req, res, next);
}

function logout(req, res) {
    req.logout();
    res.redirect("/");
}

function ajaxLogout(req, res) {
    req.logout();
    res.json({ success: true });
}

module.exports = {
    login,
    logout,
    ajaxLogout,
};
