require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail')
const puppeteer = require('puppeteer');
const app = express();
const os = require('os');
const fs = require('fs');
const morgan = require('morgan');

const updateLastEmailSent = require('./utils/updateLastEmailSent');
const checkLastReportEmailed = require('./utils/checkLastReportEmailed');

app.use(express.json());
app.use(morgan('combined'));

sgMail.setApiKey(process.env.SENDGRID_API_KEY)


// **********   MIDDLEWARE FUNCTION **********
const checkAppId = (req, res, next) => {
    const appId = req.header('X-App-Id');
    console.log(appId);

    if (appId !== process.env.ALLOWED_APP_ID) {
        return res.status(403).json({ error: 'Forbidden: Invalid App Id' });
    }
    next();
}


// **********   SEND MAIL   **********
app.post('/send-email', checkAppId, checkLastReportEmailed, async (req, res) => {
    const { to, subject, text, html, name } = req?.body;
    if (!to) {
        return res.status(400).json({ error: 'Missing required field: to' });
    }

    const screenshotPath = `debug_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    console.log(screenshotPath);

    let pdfBuffer;
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        // await page.setViewport({ width: 1280, height: 900 });
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');
        await page.evaluate(() => {
            return Promise.all(Array.from(document.images).filter(i => !i.complete).map(i => new Promise(resolve => { i.onload = i.onerror = resolve; })));
        });

        await page.screenshot({ path: screenshotPath, fullPage: true });

        pdfBuffer = await page.pdf({ format: 'letter' });
        await browser.close();
    } catch (err) {
        console.error('PDF generation error:', err);
        return res.status(500).send('Failed to generate PDF');
    }

    const msg = {
        to: [...to],
        from: { "email": "aayanglem@gmail.com", "name": "Receiptify: Digital Receipt" },
        subject: subject,
        text: text,
        attachments: [{
            content: Buffer.from(pdfBuffer).toString('base64').trim(),
            filename: `SalesReport_${name}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
        }, {
            content: Buffer.from(fs.readFileSync(screenshotPath)).toString('base64').trim(),
            filename: `SalesReport_${name}_screenshot.png`,
            type: 'image/png',
            disposition: 'attachment',
        }],
    }

    sgMail
        .send(msg)
        .then(async (response) => {
            console.log('Email sent')
            const updatePro = await updateLastEmailSent([...to])
            console.log(updatePro);
            res.status(200).json({ status: "Email sent" });
        })
        .catch((error) => {
            console.log(error);

            if (error.response && error.response.body) {
                console.error('SendGrid error:', error.response.body);
                res.status(500).json({ error: error.response.body });
            } else {
                console.error(error);
                res.status(500).send('Failed to send email');
            }
        })
        .finally(() => {
            fs.unlinkSync(screenshotPath);
            return;
        })
});


// ********** GENERATE EMAIL **********
app.post('/generate-email', checkAppId, async (req, res) => {
    const { averageTransaction, businessInfo, dailySales, dailySalesCount, selectedRangeLabel, topItems, totalSales } = req?.body;

    const html = generateHTMLForReport({ averageTransaction, businessInfo, dailySales, dailySalesCount, selectedRangeLabel, topItems, totalSales })

    if (!html.length > 0) {
        return res.status(500).json({ error: 'Failed: Template generation' });
    }

    return res.status(200).send({
        html: html
    })

});

// **********   STARTING SERVER     **********
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    const networkInterfaces = os.networkInterfaces();
    let ipAddresses = [];
    for (const iface of Object.values(networkInterfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                ipAddresses.push(alias.address);
            }
        }
    }
    console.log(`Server running on port ${PORT}`);
    console.log(`Server IP addresses: ${ipAddresses.join(', ')}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
