const hbs = require("hbs");
const moment = require("moment");

hbs.registerHelper("if_eq", (a, b, opts) => {
    if (a === b) {
        return opts.fn(this);
    }
    return opts.inverse(this);
});

hbs.registerHelper("date", (date) => {
    const m = moment(date);
    return m.format("DD.MM.YYYY");
});

hbs.registerHelper("isDef", (value, safeValue) => {
    return value || safeValue;
});

// eslint-disable-next-line no-underscore-dangle
module.exports = hbs.__express;
