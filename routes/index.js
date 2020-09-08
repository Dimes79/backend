const express = require("express");
const path = require("path");
const Bowser = require("bowser");
const { hitsLogger } = require("../modules/hitsLogger");
const authController = require("../controllers/auth-controller");

const router = express.Router();

router.get("/", defaultRoute);

// Вьюха для шары
router.get("/share/:contentType", (req, res) => {
    res.sendFile(resolve("share", req));
});

// новый вариант авторизации для фронта с 15.01.2020
router.post("/api/login", authController.login);
router.post("/api/logout", authController.ajaxLogout);

// старый вариант авторизации для фронта с 15.01.2020
router.post("/login", authController.login);
router.get(["/logout", "*/logout", "*/*/logout"], authController.logout);

router.get("/webview/model", (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(resolve("webviewModel3D", req));
    } else {
        res.status(401).send("Требуется авторизация");
    }
});

router.get("/webview/panorama", (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(resolve("webviewPanorama", req));
    } else {
        res.status(401).send("Требуется авторизация");
    }
});

router.get("/webview*", (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(resolve("webview", req));
    } else {
        res.status(401).send("Требуется авторизация");
    }
});

/**
 * Временный маршрут для отображения примера, как будет выглядеть модель 3D участка строительства
 */
router.get("/model3d*", (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(resolve("model3d", req));
    } else {
        res.status(401).send("Требуется авторизация");
    }
});

// Admin API
const adminApiRouter = require("./apiAdmin");

router.use("/admin/api/", adminApiRouter);

// User API
const userApiRouter = require("./apiUser");

router.use("/user/api/", userApiRouter);

// Agent
const agentApiRouter = require("./apiAgent");
const agentRouter = require("./agent");

router.use("/agent/api/", agentApiRouter);
router.use("/agent/", agentRouter);

// Moderator
const moderatorApiRouter = require("./apiModerator");
const moderatorRouter = require("./moderator");

router.use("/moderator/api/", moderatorApiRouter);
router.use("/moderator/", moderatorRouter);

// Audit
const auditRouter = require("./audit");

router.use("/audit/", auditRouter);

// Stream
// const streamRouter = require("./stream");
//
// router.use("/stream/", streamRouter);

router.get("/admin*", (req, res) => {
    if (req.isAuthenticated() && req.user.kind === "SUPER") {
        res.sendFile(resolve("admin", req));
    } else {
        res.status(401)
            .redirect("/login");
    }
});

router.get("/*", defaultRoute);

function isHtmlRoute(url) {
    if (url.indexOf("/storage/") > -1) {
        return false;
    }
    if (url.indexOf("/api/") > -1) {
        return false;
    }
    if (url.indexOf("/assets/") > -1) {
        return false;
    }
    if (url.indexOf("/admin") > -1) {
        return false;
    }
    return true;
}

function defaultRoute(req, res) {
    if (isHtmlRoute(req.originalUrl)) {
        const browser = Bowser.getParser(req.headers["user-agent"]);
        const isValidBrowser = browser.satisfies({
            ie: ">11",
            edge: ">=80",
            firefox: ">=55",
            chrome: ">=51",
            opera: ">=58",
            safari: ">12.1",
        });
        if (!isValidBrowser) {
            return res.render("chrome");
        }
    }
    return res.sendFile(resolve("index", req));
}

function resolve(filename, req) {
    if (isHtmlRoute(req.originalUrl)) {
        hitsLogger(req.user ? req.user.id : null, req.headers["user-agent"]);
    }
    return path.resolve(`${process.env.PUBLIC_HTML || "public_html"}/${filename}.html`);
}

module.exports = router;
