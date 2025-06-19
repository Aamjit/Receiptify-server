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