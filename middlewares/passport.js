// eslint-disable-next-line no-undef
const { User } = requireModel();
const passport = require("passport");
const LocalStrategy = require("passport-local");

passport.use(new LocalStrategy(
    {
        usernameField: "email",
        passwordField: "password",
    },
    async (username, password, done) => {
        try {
            let usernameCorrect = username;
            if (usernameCorrect.indexOf("@") === -1) {
                usernameCorrect += "@sfera.com.ru";
            }

            usernameCorrect = usernameCorrect.toLowerCase();

            const user = await User.asyncAuthenticate(usernameCorrect, password);
            if (!user || user.status !== "ACTIVE") {
                done(null, null, { message: "DENIED" });
            } else {
                passport.deserializeUser(user.id, done);
            }
        } catch (error) {
            console.log("error", error);
            done(error);
        }
    },
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, (user !== null && user.status === "ACTIVE") ? user.toJSON() : null);
    } catch (e) {
        done(e, null);
    }
});

module.exports = passport;
