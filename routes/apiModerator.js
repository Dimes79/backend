/* /moderator/api/ */

const express = require("express");
const upload = require("../modules/multer");
const commonsMiddleware = require("../middlewares/apiCommons");
const authMiddleware = require("../middlewares/apiModeratorAuthentication");
const userController = require("../controllers/moderator/user");
const lineController = require("../controllers/moderator/line");
const sublineController = require("../controllers/moderator/subline");
const contentController = require("../controllers/moderator/content");


const router = express.Router();

router.use(commonsMiddleware);

// Дальше все методы требуют авторизации
router.use("/", authMiddleware);

// Проекты
const projectController = require("../controllers/moderator/project");

router.route("/projects/")
    .get(projectController.getList);

router.route("/projects/:projectId")
    .get(projectController.get);


module.exports = router;

// Пользователи
router.get("/my/", userController.my);

// Отрезки
router.route("/lines/")
    .get(lineController.getList);
router.route("/projects/:projectId/lines/")
    .get(lineController.getList);
router.route("/lines/:lineId")
    .get(lineController.get);

// Sublines
router.route("/subLines/")
    .get(sublineController.getList);
router.route("/lines/:lineId/subLines/")
    .get(sublineController.getList);

// Контент
router.route("/lines/:lineId/content/:type")
    .get(contentController.getList);
router.route("/lines/:lineId/content/")
    .post(upload.single("file"), contentController.add);
router.route("/content/:contentId")
    .put(contentController.update)
    .delete(contentController.delete);

router.route("/lines/:lineId/content/:type/calendar")
    .get(contentController.getCalendar);

router.route("/content/linkSubline")
    .post(contentController.linkSubline);

module.exports = router;
