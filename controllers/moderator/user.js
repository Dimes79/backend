const my = function my(req, res) {
    return res.sendData(req.user);
};

module.exports = {
    my,
};
