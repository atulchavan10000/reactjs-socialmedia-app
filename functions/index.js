const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/FBAuth');


const { getAllScreams, postOneScream } = require('./handlers/screams');
const { signup, login, uploadImage, addUserDetails} = require('./handlers/users');


// Scream Routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

// users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);

exports.api = functions.region('asia-east2').https.onRequest(app);