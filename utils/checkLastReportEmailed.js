const db = require('./firebase');

/**
 * Checks if the email(s) in the 'to' parameter have already sent an email today
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns void
 */
const checkLastReportEmailed = async (req, res, next) => {
    console.log("Checking last report mail date");

    const { to } = req.body;
    if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: 'Missing required field: to' });
    }
    try {
        const usersRef = db.collection('Users');
        const snapshot = await usersRef.where('email', 'in', to).get();
        if (snapshot.empty) {
            // No user found, allow request
            return next();
        }
        const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
        let blocked = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastReportEmailSent) {
                const sentDate = new Date(data.lastReportEmailSent).toISOString().slice(0, 10);
                if (sentDate === today) {
                    blocked = true;
                }
            }
        });
        if (blocked) {
            return res.status(429).json({ error: 'Report email already sent today.' });
        }
        return next();
    } catch (err) {
        console.error('Error checking last report emailed:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = checkLastReportEmailed;