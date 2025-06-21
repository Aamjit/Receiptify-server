const admin = require('firebase-admin');
// **********   MIDDLEWARE FUNCTION **********
/**
 * Check the AppID from the Request header, incase the app that is requesting is valid, it will allow, else reject.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const checkAppIdAndAuth = async (req, res, next) => {
    const appId = req.header('X-App-Id');

    if (appId !== process.env.ALLOWED_APP_ID) {
        return res.status(403).json({ error: 'Forbidden: Invalid App Id' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach user info to request
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

const checkAppId = (req, res, next) => {
    const appId = req.header('X-App-Id');

    if (appId !== process.env.ALLOWED_APP_ID) {
        return res.status(403).json({ error: 'Forbidden: Invalid App Id' });
    }

    return next();
}

module.exports = checkAppIdAndAuth
module.exports = checkAppId