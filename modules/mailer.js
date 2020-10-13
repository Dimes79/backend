const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const hbsMailer = require("nodemailer-express-handlebars");

const tmplDir = "./views/mails/";

const transporter = nodemailer.createTransport({
    service: "yandex",
    auth: {
        user: "noreply@sfera.com.ru",
        pass: "H3o9Z6q4",
    },
});

transporter.use("compile", hbsMailer({
    viewEngine: {
        extname: ".hbs",
        partialsDir: tmplDir,
        layoutsDir: tmplDir,
        defaultLayout: false,
    },
    viewPath: tmplDir,
    extName: ".hbs",
}));

const fromEmail = "noreply@sfera.com.ru";

async function mailer(to, subject, tmpl, data = {}) {
    const mailOptions = {
        from: fromEmail,
        to,
        subject,
        template: tmpl,
        context: data,
    };

    const attachments = await getAttachments(tmpl);
    if (attachments) {
        mailOptions.attachments = attachments;
    }

    return new Promise(((resolve, reject) => {
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log(`mailer error ${error}`);
                reject(error);
            } else {
                resolve();
            }
        });
    }));
}

async function getAttachments(tmpl) {
    const dir = path.join(tmplDir, tmpl);
    if (!fs.existsSync(dir)) {
        return false;
    }

    return new Promise(((resolve, reject) => {
        fs.readdir(dir, (error, files) => {
            if (error) {
                console.log(`mailer error ${error}`);
                reject(error);
            } else {
                const attachments = files.reduce((acc, file) => acc.concat({
                    filename: file,
                    path: path.join(dir, file),
                    cid: file,
                }), []);

                resolve(attachments);
            }
        });
    }));
}

module.exports = {
    mailer,
};
