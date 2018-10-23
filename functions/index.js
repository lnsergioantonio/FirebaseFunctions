const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.sendNotificationLogin = functions.firestore.document("users/{uid}")
                                .onCreate((snap, context) => {
                                    // get params of context
                                    const newUid = context.uid
                                    // Get an object representing the document
                                    // e.g. {'name': 'Marie', 'age': 66}
                                    // const newValue = 
                                    // access a particular field as you would any JS property
                                    // const name = newValue.name;
                                    // const photo = newValue.photo;
                                    
                                    // Get the new profile.
                                    const getNewUserProfile = snap.data()

                                    // Get the list of device notification tokens.
                                    const getDeviceTokensPromise = admin.firestore().collection("users").get()
                                    
                                    // The snapshot to the user's tokens.
                                    let tokensSnapshot
                                    console.log(getDeviceTokensPromise)
                                    return Promise.all([getDeviceTokensPromise, getNewUserProfile]).then(results => {
                                        tokensSnapshot = results[0];
                                        const NewUser = results[1];
                                
                                        // Check if there are any device tokens.
                                        if (!tokensSnapshot.hasChildren()) {
                                            return console.log('There are no notification tokens to send to.');
                                        }
                                        console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
                                        console.log('Fetched NewUser profile', NewUser);
                                
                                        // Notification details.
                                        const payload = {
                                            notification: {
                                            title: 'Hay un nuevo usuario!',
                                            body: `${NewUser.name} esta en linea.`,
                                            icon: NewUser.photo
                                            }
                                        };
                                        let listTokens =[]
                                        tokensSnapshot.forEach(snap=>{
                                            listTokens.push(snap.data().token) 
                                        })
                                        // Listing all tokens as an array.
                                        tokens = Object.keys(listTokens);
                                        // Send notifications to all tokens.
                                        return admin.messaging().sendToDevice(tokens, payload);
                                                }).then((response) => {
                                                    // For each message check if there was an error.
                                                    const tokensToRemove = [];
                                                    response.results.forEach((result, index) => {
                                                        const error = result.error;
                                                        if (error) {
                                                            console.error('Failure sending notification to', tokens[index], error);
                                                            // Cleanup the tokens who are not registered anymore.
                                                            if (error.code === 'messaging/invalid-registration-token' ||
                                                                error.code === 'messaging/registration-token-not-registered') {
                                                                tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
                                                            }
                                                        }
                                                    });
                                                    return Promise.all(tokensToRemove);
                                                });
                                });
                              
