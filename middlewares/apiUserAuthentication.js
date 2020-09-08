// eslint-disable-next-line no-undef
const permitKinds = ["SUPER", "USER"];

module.exports = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, error: "authentication failed" });
    }

    let isPermit = req.user.status === "ACTIVE";
    if (isPermit) {
        isPermit = permitKinds.find((element) => req.user.kind === element);
    }
    if (!isPermit) {
        return res.status(401).json({
            success: false,
            error: "authentication failed",
        });
    }

    return next();
};
