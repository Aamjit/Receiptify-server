require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail')
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

app.post('/send-email', async (req, res) => {
    const { to, subject, text, html, name } = req?.body;

    let pdfBuffer;
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html || '', { waitUntil: 'networkidle0' });
        pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();
    } catch (err) {
        console.error('PDF generation error:', err);
        return res.status(500).send('Failed to generate PDF');
    }

    const msg = {
        to: [...to], // Change to your recipient
        from: 'aayanglem@gmail.com', // Change to your verified sender
        subject: subject,
        text: text,
        attachments: [
            {
                content: Buffer.from(pdfBuffer).toString('base64').trim(),
                filename: `SalesReport_${name}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ],
    }

    sgMail
        .send(msg)
        .then((response) => {
            console.log('Email sent')
            res.send(response)
        })
        .catch((error) => {
            if (error.response && error.response.body) {
                console.error('SendGrid error:', error.response.body);
                res.status(500).json({ error: error.response.body });
            } else {
                console.error(error);
                res.status(500).send('Failed to send email');
            }
        })
        .finally(() => {
            return;
        })
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
