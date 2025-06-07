var admin = require("firebase-admin");

var serviceAccount = require(process.env.APP_ENV ? "../etc/secrets/serviceAccountKey.json" : "/etc/secrets/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'quickbill-bb6bd',
});

const db = admin.firestore();

module.exports = db;