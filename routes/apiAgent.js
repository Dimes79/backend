/* /agent/api/ */

const express = require("express");
const passport = require("passport");
const upload = require("../modules/multer");

const router = express.Router();

const commonsMiddleware = require("../middlewares/apiCommons");

router.use(commonsMiddleware);

// Авторизация
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.json({
                success: false,
                error: "userNotFound",
            });
        }

        if (user.kind !== "AGENT" && user.kind !== "SUPER") {
            return res.status(401).json({
                success: false,
                error: "permissionDenied",
            });
        }

        req.logIn(user, (error) => {
            if (error) return next(error);
            return res.json({
                success: true,
                redirect: "/agent",
                payload: req.user,
            });
        });
        return null;
    })(req, res, next);
});

// Дальше все методы требуют авторизации
const authMiddleware = require("../middlewares/apiAgentAuthentication");

router.use("/", authMiddleware);

// Пользователи
const userController = require("../controllers/agent/user");

router.get("/users/my/", userController.my);


// Проекты
const projectController = require("../controllers/agent/project");

router.route("/projects/")
    .get(projectController.getList);
router.route("/projectsList/")
    .get(projectController.getListAll);

// Отрезки
const lineController = require("../controllers/agent/line");

router.route("/lines/")
    .get(lineController.getList);


// Контент
const contentController = require("../controllers/agent/content");

router.route("/content/")
    .post(upload.single("file"), contentController.add);
router.route("/content/archive/")
    .post(upload.single("file"), contentController.archive);
router.route("/content/site/")
    .post(upload.single("file"), contentController.addFromSite);
router.route("/content/uploadedSet/")
    .post(contentController.uploadedSet);
router.route("/content/tv")
    .post(upload.single("file"), contentController.addTv);
router.route("/content/uploadedTv/")
    .post(contentController.uploadedTv);
router.route("/content/timelapse")
    .post(upload.single("file"), contentController.addTimelapse);
router.route("/content/uploadedTimelapse/")
    .post(contentController.uploadedTimelapse);

// Пикеты
const picketController = require("../controllers/agent/picket");

router.route("/pickets/")
    .get(picketController.getList);

module.exports = router;
