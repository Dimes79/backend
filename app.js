process.env.PROJECT_ROOT_DIR = __dirname;

const debug = require("debug")("platforma:app");
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const timeout = require("connect-timeout");
const logger = require("morgan");

// Создаем нужные каталоги
const dirCreator = require("./modules/dirCreator");

dirCreator.start();

// Schedule jobs
const schedule = require("./schedule");

schedule.start();

const app = express();

const hbs = require("./modules/hbs");

app.set("view engine", "hbs");
app.engine("hbs", hbs);

// Session
const session = require("./modules/session");

app.use(session);

// Passport
const passport = require("./middlewares/passport");

app.use(passport.initialize());
app.use(passport.session());
app.use(timeout("600s"));
app.use(logger(":status :method :url :response-time[5]s", { stream: { write: debug } }));
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: "500mb" }));
app.use(cookieParser(process.env.SECRET_KEY || "SECRET_KEY"));

app.use(express.static(process.env.PUBLIC_HTML || path.join(__dirname, "public_html")));
app.use("/public", express.static(process.env.PUBLIC || path.join(__dirname, "public")));
app.use("/promo", express.static(path.join(__dirname, "promo")));

app.use("/stream", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    next();
});
app.use("/stream", express.static(path.join(__dirname, "stream")));

// Доступ в папку storage только для авторизованых пользователей нужным набором прав
const storageAuthentication = require("./middlewares/storageAuthentication");

app.use("/storage", storageAuthentication, express.static(path.join(__dirname, "storage")));
app.use("/static", express.static(path.join(__dirname, process.env.STATIC_DIR || "static")));

const indexRouter = require("./routes/index");

app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res) => {
    debug(err);
    res.status(err.status || 500);
    res.send("error");
});

module.exports = app;
