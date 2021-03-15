const lastVersions = {
    1: 10,
};


function chkVersion(req, res) {
    const { os, version } = req.query;
    const out = {
        newVersion: false,
    };

    if (version < lastVersions[os]) {
        out.newVersion = true;
    }

    res.sendData(out);
}

module.exports = {
    chkVersion,
};
