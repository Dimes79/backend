/* /audit/ */

const express = require("express");
const passport = require("passport");

const router = express.Router();
const permitKinds = ["SUPER", "AUDITOR"];

// Авторизация
router.post("*", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
        console.log("send", user);
        if (err) {
            return next(err);
        }

        if (!user) {
            return next();
        }

        const isPermit = permitKinds.find((element) => user.kind === element);
        if (!isPermit) {
            return next();
        }

        req.logIn(user, (error) => {
            if (error) return next(error);
            return res.redirect(req.originalUrl);
        });
        return null;
    })(req, res, next);
});


router.use("*", (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    return res.render("audit/login", {
    });
});


const auditController = require("../controllers/audit/");

router.get("/:objects/:type/:date", auditController.common);
router.get("/:objects/content/:type/:date", auditController.content);

module.exports = router;
