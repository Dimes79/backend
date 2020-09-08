exports.getList = async function getList(req, res, next) {
    req.preparePagination();

    const rows = [];

    const { dateFrom } = req.query;
    let start;
    if (dateFrom === "2018-07-10") {
        start = 1;
    } else if (dateFrom === "2018-07-16") {
        start = 4;
    } else {
        start = 7;
    }


    for (let i = start; i < start + 3; i += 1) {
        rows.push({
            id: i,
            src: {
                src: `/storage/aerial/${i}.mp4`,
            },
            gps: {
                lat: 59.571097,
                long: 28.241055,
            },
        });
    }
    res.sendData(rows, 0);
};


exports.getCalendar = async function add(req, res, next) {
    const dates = [
        "2018-07-24", "2018-07-16", "2018-07-10",
    ];

    res.sendData(dates, 0);
};
