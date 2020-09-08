const express = require("express");
const path = require("path");

const router = express.Router();
const permitKinds = ["SUPER", "AGENT"];

router.get("/login", (req, res) => {
    res.redirect("/login");
});

router.get(
    "*",
    (req, res, next) => {
        let isPermit = (req.isAuthenticated() && req.user.status === "ACTIVE");
        if (isPermit) {
            isPermit = permitKinds.find((element) => req.user.kind === element);
        }

        if (isPermit) {
            next();
        } else {
            res.status(401).redirect("/login");
        }
    },
    (req, res) => {
        res.sendFile(path.resolve(`${process.env.PUBLIC_DIR || "public_html"}/agent.html`));
    },
);

module.exports = router;
