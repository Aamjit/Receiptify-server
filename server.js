require('dotenv').config();
const express = require('express');
const sgMail = require('@sendgrid/mail')
const app = express();
const os = require('os');
const morgan = require('morgan');

const checkLastReportEmailed = require('./utils/checkLastReportEmailed');
const checkAppIdAndAuth = require('./middleware/checkApp');
const sendReportEmail = require('./handles/sendReportEmail');
const generateReportHTML = require('./handles/generateReportHTML');
const generateReportData = require('./handles/generateReportData');
const checkAppId = require('./middleware/checkApp');

app.use(express.json());
app.use(morgan('combined'));

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// ********** CHECK CONNECTION **********
app.get('/', (req, res) => {
    res.status(200).json({ message: "Ok" })
})
// **********   SEND MAIL   **********
app.post('/send-email', checkAppIdAndAuth, checkLastReportEmailed, sendReportEmail);
// ********** GENERATE HTML **********
app.post('/generate-report-html', checkAppIdAndAuth, generateReportHTML);
// ********** PROCESS REPORT DATA **********
app.post('/generate-report-data', checkAppIdAndAuth, generateReportData);
//
app.get('/sendgrid-mail', checkAppId, (req, res) => {
    const msg = {
        to: ['sendgridtesting@gmail.com'],
        from: {
            name: "Amarjit Yanglem",
            email: "aayanglem@gmail.com"
        },
        subject: '91F53368-00EF',
        text: '#21798353'
    }

    sgMail
        .send(msg)
        .then(async () => {
            console.log('Email sent')
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
            return;
        })
})

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
    console.error('Unhandled Rejection at:', promise, '\nreason:', reason);
});