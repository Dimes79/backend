const exiftool = require("node-exiftool");
const exiftoolBin = (process.platform !== "win32") ? require("dist-exiftool") : undefined;

const saveExif = async function saveExif(file, data) {
    const ep = new exiftool.ExiftoolProcess(exiftoolBin);

    const exif = {
        UserComment: `${data.projectId}:${data.lineId}`,
        CreateDate: `${data.date} 00:00:00`,
        GPSLatitude: data.gps.lat,
        GPSLongitude: data.gps.long,
    };

    return ep
        .open()
        .then(() => ep.readMetadata(file, []))
        .then(() => ep.writeMetadata(file, exif, ["overwrite_original"]))
        .then(console.log, console.error)
        .then(() => ep.close())
        .catch(() => exif);
};

const getExif = async function getExif(file) {
    const ep = new exiftool.ExiftoolProcess(exiftoolBin);
    const exif = {
        gps: null,
        date: null,
        datetime: null,
        magneticAngle: null,
    };

    return ep
        .open()
        .then(() => ep.readMetadata(file, []))
        .then((result) => {
            const metadata = result.data[0];

            if (metadata.GPSLatitude) {
                const lat = gpsToFloat(metadata.GPSLatitude);
                const long = gpsToFloat(metadata.GPSLongitude);
                exif.gps = { lat, long };
            }

            if (!exif.gps) {
                console.log("getExif", `unk format ${metadata.GPSLatitude}`);
            }

            if (metadata.CreateDate) {
                const date = (metadata.CreationDate) ? metadata.CreationDate : metadata.CreateDate;
                exif.date = converDate(date);
                exif.datetime = converDatetime(date);
            }

            if (metadata.GPSImgDirection) {
                exif.magneticAngle = Math.round(metadata.GPSImgDirection);
            }

            ep.close();
            return exif;
        })
        .catch((error) => {
            ep.close();
            console.log("getExif", error);
            return exif;
        });
};

function converDatetime(date) {
    if (!date) {
        return null;
    }

    let outDate = converDate(date);
    if (!outDate) {
        return null;
    }
    outDate += date.substring(10, 19);

    return outDate;
}

function gpsToFloat(gps) {
    if (!gps) {
        return null;
    }
    const matches = gps.match(/^([\d\\.]+).+?([\d\\.]+).+?([\d\\.]+)/);
    if (!matches) {
        return null;
    }

    return Number.parseFloat(matches[1]) + Number.parseFloat(matches[2]) / 60 + Number.parseFloat(matches[3]) / 3600;
}

function converDate(date) {
    if (!date) {
        return null;
    }

    const outDate = date.replace(/:/g, "-").substring(0, 10);
    if (outDate.indexOf("0000-00-00") !== -1) {
        return null;
    }

    return outDate;
}

module.exports = {
    getExif,
    saveExif,
};
