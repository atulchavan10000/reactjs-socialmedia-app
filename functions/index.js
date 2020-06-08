const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/FBAuth');
const { db } = require('./util/admin');

const {
    getAllScreams,
    postOneScream,
    getScream,
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream
} = require('./handlers/screams');
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser
} = require('./handlers/users');


// Scream Routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);

// users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);


exports.api = functions.region('asia-east2').https.onRequest(app);


// on creation of likes document make a snapshot of it and create notification
exports.createNotificationOnLike = functions.region('asia-east2').firestore.document('likes/{id}')
    // snapshot of like document
    .onCreate((snapshot) => {
        // fetching the scream i.e. doc in then block coz we need author (userHandle) of it
        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                // if the scream exists, we get its author i.e. userHandle 
                // and create a notification for like
                if (doc.exists) {
                    // creating a notification with the same id as snapshot i.e. like id
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString,
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    })
                }
            })
            .then(() => {
                return;
            })
            .catch(err => {
                console.error(err);
                return;
            });
    })