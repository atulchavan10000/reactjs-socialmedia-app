const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();


/**
 * Fixing auth issue
 * https://stackoverflow.com/questions/58127896/error-could-not-load-the-default-credentials-firebase-function-to-firestore/58140389#58140389
 * https://console.firebase.google.com/u/0/project/socialape-35167/settings/serviceaccounts/adminsdk
 */
var serviceAccount = require("./keys/admin-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-35167.firebaseio.com"
});


const firebaseConfig = {
    apiKey: "AIzaSyA5WfKmNwQwjRoMNMd6SuQ68PJYJvt9PFU",
    authDomain: "socialape-35167.firebaseapp.com",
    databaseURL: "https://socialape-35167.firebaseio.com",
    projectId: "socialape-35167",
    storageBucket: "socialape-35167.appspot.com",
    messagingSenderId: "327861949312",
    appId: "1:327861949312:web:6b5538367d749872aca765",
    measurementId: "G-7NHQ5JFPB7"
};

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig)

const db = admin.firestore();

app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            });
            return res.json(screams);
        })
        .catch(err => console.error(err));
})



app.post('/scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully` })
        })
        .catch(err => {
            res.status(500).json({ error: 'Something Went Wrong' });
            console.error(err);
        })
});


// SignUp route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };
    // TODO : validate data
    let token, userId
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({ handle: 'this handle is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data =>{
            userId = data.user.uid;
            return data.user.getIdToken();             
        })
        .then(idToken =>{
            token = idToken;
            const userCredentials ={
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(()=>{
            return res.status(201).json({ token })
        })
        .catch(err =>{
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email : 'Email is already in use'})
            }else{
                return res.status(500).json({ error: err.code });
            }

        })
})

exports.api = functions.region('asia-east2').https.onRequest(app);