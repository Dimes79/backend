// node ./tools/filePuppeteer.js

const puppeteer = require("puppeteer");
const fs = require("fs");

const indexFile = "./tools/data/index.html"; // file://${process.cwd()}
const inputFile = `file://${process.cwd()}/tools/data/in.jpg`;
const outFile = './tools/data/out.jpg';

(async () => {
    await main(1000, 1000);
    console.log("Done");
})();

async function main(outWidth, outHeight) {
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
            '--disable-web-security',
            `--window-size=${outWidth},${outHeight}`
        ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: outWidth, height: outHeight })
    page
        .on('response', async response => {
            if (response.url().indexOf("in.jpg") !== -1) {
                await delay(500);
                await page.screenshot({ path: outFile });
                await browser.close();
            }
            console.log(`${response.status()} ${response.url()}`)
        })
        .on('requestfailed', request =>
            console.log(`${request.failure().errorText} ${request.url()}`))
    await page.setContent(getHtml());
    await page.evaluate(_ => {
        view.setYaw(45 * Math.PI/180);
        view.setPitch(-30 * Math.PI/180);
        scene.switchTo();
    });

}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getHtml() {
    let contentHtml = fs.readFileSync(indexFile, 'utf8');
    contentHtml = contentHtml.replace("%IMG_URL%", `https://sfera.com.ru/static/in.jpg`)
    contentHtml = contentHtml.replace("%MARZIPANO_PATH%", `file://${process.cwd()}/tools/data/marzipano.js`)
    return contentHtml;
}
