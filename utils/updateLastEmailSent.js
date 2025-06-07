const db = require('./firebase');

/**
 * Updates the last email sent timestamp for all users matching the given email(s).
 * @param {string[]} userEmails - Array of user email addresses.
 * @returns {Promise<void>}
 */

async function updateLastEmailSent(userEmails = []) {
    if (!Array.isArray(userEmails) || userEmails.length === 0) throw new Error('User email(s) is required');
    const usersRef = db.collection('Users');
    const batch = db.batch();
    const snapshot = await usersRef.where('email', 'in', userEmails).get();
    if (snapshot.empty) return;
    snapshot.forEach(doc => {
        batch.update(doc.ref, { lastReportEmailSent: new Date().toISOString() });
    });
    return await batch.commit();
}

module.exports = updateLastEmailSent;