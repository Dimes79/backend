// eslint-disable-next-line no-undef
const { UploadLogs, User } = requireModel();

const upload = async function commonInfo(req, res, next) {
    const { limit, page } = req.preparePagination();

    try {
        const { rows, count } = await UploadLogs.findAndCountAll({
            include: [{
                model: User,
                as: "user",
            }],
            order: [["id", "DESC"]],
            offset: (page - 1) * limit,
            limit,
        });
        const dataRows = [];
        rows.forEach((row) => {
            const r = {
                status: row.status,
                type: row.type,
                date: row.date,
                dateStartUpload: row.dateStartUpload,
                dateFinUpload: row.dateFinUpload,
                user: (row.user) ? row.user.name : "unk",
                userId: (row.user) ? row.user.id : "0",
            };

            const { data } = row;
            r.total = data.total;
            r.totalAttempts = data.totalAttempts;
            if (data.detail) {
                r.detail = {};
                Object.keys(data.detail).forEach((keyT) => {
                    const p = keyT.split(",");
                    const contentType = p[2];
                    const v = data.detail[keyT];
                    if (!r.detail[contentType]) {
                        r.detail[contentType] = 0;
                    }
                    r.detail[contentType] += v;
                });
            }
            if (data.detailAttempts) {
                r.detailAttempts = {};
                Object.keys(data.detailAttempts).forEach((keyT) => {
                    const p = keyT.split(",");
                    const contentType = p[2];
                    const v = data.detailAttempts[keyT];
                    if (!r.detailAttempts[contentType]) {
                        r.detailAttempts[contentType] = 0;
                    }
                    r.detailAttempts[contentType] += v;
                });
            }

            dataRows.push(r);
        });

        res.sendData(dataRows, count);
    } catch (e) {
        next(e);
    }
};

module.exports = {
    upload,
};
