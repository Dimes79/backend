const expressSession = require("express-session");
const RedisStore = require("connect-redis")(expressSession);

const session = expressSession({
    secret: process.env.SESSION_KEY || "123",
    store: new RedisStore({
        url: process.env.REDIS_URL,
        prefix: process.env.REDIS_PREFIX || "",
    }),
    resave: false,
    saveUninitialized: true,
    cookie: {
        path: "/",
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 3600 * 24 * 30 * 12 * 10,
    },
});

module.exports = session;
