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
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
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
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead)

exports.api = functions.region('asia-east2').https.onRequest(app);


// on creation of likes document make a snapshot of it and create notification
exports.createNotificationOnLike = functions.region('asia-east2').firestore.document('likes/{id}')
    // snapshot of like document
    .onCreate((snapshot) => {
        // fetching the scream i.e. doc in then block coz we need author (userHandle) of it
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then((doc) => {
                // if the scream exists, we get its author i.e. userHandle 
                // and create a notification for like
                // dont create notification if user likes their own comment
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    // creating a notification with the same id as snapshot i.e. like id
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    })
                }
            })
            .catch((err) => console.error(err));
    }
    );

// delete notification. 
// use case is if someone likes the scream then notification gets created
// if that user again unlikes the comment then notification should be deleted
// so the scream author wont get a notification in this case
exports.deleteNotificationOnUnlike = functions.region('asia-east2').firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        // id of like is same as notification id, so we need to provide like id to delete notification
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch(err => {
                console.error(err);
                return;
            })
    })

exports.createNotificationOnComment = functions.region('asia-east2').firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        // fetching the scream i.e. doc in then block coz we need author (userHandle) of it
        return db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then(doc => {
                // if the scream exists, we get its author i.e. userHandle 
                // and create a notification for comment
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    // creating a notification with the same id as snapshot i.e. comment id
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id
                    })
                }
            })
            .catch(err => {
                console.error(err);
                return;
            });
    })

// make changes to imageUrl on all screams authored by user
// iff they change their imageUrl on profile
exports.onUserImageChange = functions.region('asia-east2').firestore.document('/users/{userId}')
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            console.log('image has changed');
            const batch = db.batch();
            return db.collection('screams').where('userHandle', '==', change.before.data().handle).get()
                .then(data => {
                    data.forEach(doc => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, { userImage: change.after.data().imageUrl });
                    })
                    return batch.commit();
                })  
        } else return true;
    })


// if scream get deleted, then delete all related content like comments, likes, notifications from database
exports.onScreamDelete = functions.region('asia-east2').firestore.document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db.collection('comments').where('screamId', '==', screamId).get()
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('screamId', '==', screamId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('screamId', '==', screamId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
            })
            .catch(err => console.error(err));
    })