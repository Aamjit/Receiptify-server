const updateLastEmailSent = require("../utils/updateLastEmailSent");
const puppeteer = require('puppeteer');
const fs = require('fs');
const sgMail = require('@sendgrid/mail')

// **********   SEND MAIL   **********
/**
 * Trigger Sendgrid API to send mail with sales report attached as PDF. HTML is attached as part of the request body
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const sendReportEmail = async (req, res) => {
    const { to, subject, text, html, name } = req?.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
        // throw new Error('User email(s) is required');
        return res.status(400).json({ error: 'field {to}: User email(s) is required' });
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
        return res.status(500).json({ error: 'Failed to generate PDF' });
    }

    const msg = {
        to: [...to],
        from: {
            name: "Receiptify: Digital Receipts",
            email: "aayanglem@gmail.com"
        },
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
        .then(async () => {
            console.log('Email sent')
            await updateLastEmailSent([...to])
            res.status(200).json({ message: "success" });
        })
        .catch((error) => {
            console.log(error);

            if (error.response && error.response.body) {
                console.error('SendGrid error:', error.response.body);
                res.status(500).json({ error: error.response.body });
            } else {
                console.error(error);
                res.status(500).json({ error: 'Failed to send email' });
            }
        })
        .finally(() => {
            fs.unlinkSync(screenshotPath);
            return;
        })
};

module.exports = sendReportEmail