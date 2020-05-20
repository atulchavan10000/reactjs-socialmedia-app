const admin = require('firebase-admin');

/**
 * Fixing auth issue
 * https://stackoverflow.com/questions/58127896/error-could-not-load-the-default-credentials-firebase-function-to-firestore/58140389#58140389
 * https://console.firebase.google.com/u/0/project/socialape-35167/settings/serviceaccounts/adminsdk
 */
var serviceAccount = require("../keys/admin-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-35167.firebaseio.com"
});


const db = admin.firestore();

module.exports = { admin, db };