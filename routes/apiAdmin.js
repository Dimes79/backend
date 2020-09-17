/* /admin/api/ */

const express = require("express");
const passport = require("passport");
const upload = require("../modules/multer");
const authMiddleware = require("../middlewares/apiAdminAuthentication");
const dashboardController = require("../controllers/admin/dashboard");
const userController = require("../controllers/admin/user");
const projectController = require("../controllers/admin/project");
const lineController = require("../controllers/admin/line");
const contentController = require("../controllers/admin/content");
const timelapseController = require("../controllers/admin/timelapse");
const activityController = require("../controllers/admin/activity");
const hitsController = require("../controllers/admin/hits");
const picketController = require("../controllers/admin/picket");
const companyController = require("../controllers/admin/company");
const promoFilterController = require("../controllers/admin/promoFilter");
const companyContentController = require("../controllers/admin/companyContent");
const sublineController = require("../controllers/admin/subline");
const siteEventController = require("../controllers/admin/siteEvent");

const permitKinds = ["SUPER"];
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

        const isPermit = permitKinds.find((element) => user.kind === element);
        if (!isPermit) {
            return res.status(401).json({
                success: false,
                error: "permissionDenied",
            });
        }

        req.logIn(user, (error) => {
            if (error) return next(error);
            return res.json({
                success: true,
                redirect: "/admin",
                payload: req.user,
            });
        });
        return null;
    })(req, res, next);
});

// Дальше все методы требуют авторизации
router.use("/", authMiddleware);

// Dashboard
router.get("/dashboard/", dashboardController.commonInfo);

// Пользователи
router.get("/users/my/", userController.my);
router.route("/users/")
    .get(userController.getList)
    .post(userController.add);
router.route("/users/:modelID")
    .get(userController.get)
    .put(userController.update)
    .delete(userController.delete);

// Проекты
router.route("/projects/")
    .get(projectController.getList)
    .post(projectController.add);
router.route("/projects/:modelID")
    .get(projectController.get)
    .put(projectController.update)
    .delete(projectController.delete);
router.route("/projects/:modelID/upload")
    .post(upload.single("file"), projectController.upload);

// Отрезки
router.route("/projects/:projectId/lines/")
    .get(lineController.getList)
    .post(lineController.add);
router.route("/projects/:projectId/lines/:modelID")
    .get(lineController.get)
    .put(lineController.update)
    .delete(lineController.delete);
router.route("/projects/:projectId/lines/:modelID/upload")
    .post(upload.single("file"), lineController.upload);

// Контент
router.route("/projects/:projectId/lines/:lineId/content/recalculateGps")
    .post(contentController.recalculateGps);
router.route("/content/linkSubline")
    .post(contentController.linkSubline);
router.route("/projects/:projectId/lines/:lineId/content/:type")
    .get(contentController.getList)
    .post(upload.single("file"), contentController.add);
router.route("/projects/:projectId/lines/:lineId/content/:type/:modelID")
    .put(contentController.update)
    .delete(contentController.delete);
router.route("/projects/:projectId/lines/:lineId/content/:type/calendar")
    .get(contentController.getCalendar);
router.route("/lines/:lineId/content/:type/first")
    .post(contentController.setFirst);

// Информация для Timelapse
router.route("/timelapseInfo/:contentId")
    .get(timelapseController.getList)
    .post(timelapseController.add);
router.route("/timelapseInfo/:contentId/cloneTable")
    .get(timelapseController.cloneTable);
router.route("/timelapseInfo/:contentId/:modelId")
    .put(timelapseController.update)
    .delete(timelapseController.deleteRow);

// Активность
router.route("/activity/upload")
    .get(activityController.upload);

// Хиты
router.route("/hits/")
    .get(hitsController.getList);


// Пикеты
router.route("/pickets")
    .get(picketController.list)
    .post(picketController.create);
router.route("/pickets/:id")
    .get(picketController.get)
    .put(picketController.update)
    .delete(picketController.destroy);

// Компании
router.route("/companies/")
    .get(companyController.getList)
    .post(companyController.add);
router.route("/companies/:modelID")
    .get(companyController.get)
    .put(companyController.update)
    .delete(companyController.delete);
router.route("/companies/:modelID/upload")
    .post(upload.single("file"), companyController.upload);
router.route("/companies/:modelID/uploadVideo")
    .post(upload.single("file"), companyController.uploadVideo);

// Фильтр контента компании
router.route("/promoFilter/")
    .get(promoFilterController.getList)
    .post(promoFilterController.add);
router.route("/promoFilter/:modelID")
    .get(promoFilterController.get)
    .put(promoFilterController.update)
    .delete(promoFilterController.delete);

// Контент компании
router.route("/companyContent/:companyId/:section/:type")
    .get(companyContentController.getList)
    .post(upload.single("file"), companyContentController.add);
router.route("/companyContent/:modelID/tmb")
    .post(upload.single("file"), companyContentController.updateTmb);
router.route("/companyContent/:modelID")
    .put(companyContentController.update)
    .delete(companyContentController.delete);
router.route("/companyContent/:companyId/:section/:type/calendar")
    .get(companyContentController.getCalendar);


// Subline
router.route("/lines/:lineId/sublines")
    .get(sublineController.getList)
    .post(sublineController.add);
router.route("/lines/:lineId/sublines/:modelID")
    .get(sublineController.get)
    .put(sublineController.update)
    .delete(sublineController.delete);

// SiteEvents
router.route("/siteEvents/")
    .get(siteEventController.getList);
router.route("/siteEvents/byUsers")
    .get(siteEventController.getListByUser);

module.exports = router;
