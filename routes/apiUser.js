/* /user/api/ */

const express = require("express");
const passport = require("passport");
const commonsMiddleware = require("../middlewares/apiCommons");
const authMiddleware = require("../middlewares/apiUserAuthentication");
const userController = require("../controllers/user/user");
const companyController = require("../controllers/user/company");
const promoFilterController = require("../controllers/user/promoFilter");
const companyContentController = require("../controllers/user/companyContent");
const projectController = require("../controllers/user/project");
const lineController = require("../controllers/user/line");
const picketController = require("../controllers/user/picket");
const eventController = require("../controllers/user/event");
const contentController = require("../controllers/user/content");
const timelapseController = require("../controllers/user/timelapse");
const aerialController = require("../controllers/user/aerial");
const siteEventsController = require("../controllers/user/siteEvents");
const shareController = require("../controllers/user/shareController");

const router = express.Router();

router.use(commonsMiddleware);

// Авторизация
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                error: "AUTH_ERROR",
            });
        }

        if (!user) {
            return res.json({
                success: false,
                error: "userNotFound",
            });
        }

        if (!["USER", "SUPER"].includes(user.kind)) {
            return res.json({
                success: false,
                error: "permissionDenied",
            });
        }

        return req.logIn(user, (error) => {
            if (error) {
                console.log(error);
                return res.status(401).json({
                    success: false,
                    error: "AUTH_ERROR",
                });
            }
            return res.json({
                success: true,
                redirect: "/objects",
                payload: req.user,
            });
        });
    })(req, res, next);
});

// Пользователи
router.route("/user/")
    .post(userController.add);
router.route("/user/confirmRegistration")
    .get(userController.confirmRegistration);
router.route("/user/remindPassword")
    .post(userController.remindPassword);
router.route("/user/chgPassword")
    .post(userController.chgPassword);

// События на сайте
router.route("/siteEvents")
    .post(siteEventsController.add);

// Дальше все методы требуют авторизации
router.use("/", authMiddleware);

// Пользователи
router.get("/my/", userController.my);
router.post("/user/regTmpUser", userController.regTmpUser);
router.post("/user/regTmpUserV2", userController.regTmpUserV2);

router.use((req, res, next) => {
    req.paging = {
        limit: (req.query.limit > 1000) ? 1000 : (req.query.limit || 1000),
        offset: req.query.offset || 0,
    };
    next();
});

// Компании
router.route("/companies/")
    .get(companyController.getList);
router.route("/companies/:modelID")
    .get(companyController.get);

// Фильтр контента компании
router.route("/promoFilter")
    .get(promoFilterController.getList);
router.route("/companies/:companyId/promoFilter")
    .get(promoFilterController.getList);

// Контент компаний
router.route("/companyContent/:companyId/streams")
    .get(companyContentController.getStreams);
router.route("/companyContent/streams")
    .get(companyContentController.getStreams);

router.route("/companyContent/:companyId/promo")
    .get(companyContentController.getPromo);
router.route("/companyContent/promo")
    .get(companyContentController.getPromo);

// TODO удалить со временем
router.route("/content/streams")
    .get(companyContentController.getStreams);

// Проекты
router.route("/companies/:companyId/projects/")
    .get(projectController.getList);
router.route("/projects/:modelID")
    .get(projectController.get);
router.route("/projects/")
    .get(projectController.getList);

// Отрезки
router.route("/projects/:projectId/lines/")
    .get(lineController.getList);
router.route("/projects/:projectId/lines/:modelID")
    .get(lineController.get);
router.route("/lines/:modelID")
    .get(lineController.getByLineId);

// Пикеты
router.route("/projects/:projectId/pickets").get(picketController.list);
router.route("/pickets/:modelID").get(picketController.get);

// События
router.route("/pickets/:picketId/events").get(eventController.list);
router.route("/events/:modelID").get(eventController.get);

// Контент
router.route("/projects/:projectId/lines/:lineId/content/:type")
    .get(contentController.getList);
router.route("/lines/:lineId/content/:type")
    .get(contentController.getList);
router.route("/lines/:lineId/contentByPoint/")
    .get(contentController.getListByPoint);
router.route("/content/:type")
    .get(contentController.getContentById);
router.route("/projects/:projectId/lines/:lineId/content/:type/calendar")
    .get(contentController.getCalendar);
router.route("/lines/:lineId/content/:type/calendar")
    .get(contentController.getCalendarByLineId);
router.route("/content/lapse/:id")
    .get(contentController.getTimelapseById);

// Информация для Timelapse
router.route("/timelapseInfo/:contentId")
    .get(timelapseController.getList);

// Аэро
router.route("/aerial")
    .get(aerialController.getList);
router.route("/aerial/calendar")
    .get(aerialController.getCalendar);

// Share
router.route("/share")
    .get(shareController.get);

module.exports = router;
