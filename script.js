import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAasfaqKX6_YerMvNNqMEkLhyHQKCkUCYY", authDomain: "notification-6e1fe.firebaseapp.com", projectId: "notification-6e1fe", storageBucket: "notification-6e1fe.appspot.com", messagingSenderId: "466180249875", appId: "1:466180249875:web:a8cdea1129ecb9d20b62e6", measurementId: "G-LYGLEQDE0M" };

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);
const vapidKey = "BBWE-aOx-7UjOPWiOPjomq5iF7ElZ3C2aOpQM9QE65ZR6d21IoTunZLI4nH6s-IBrt_MgSIObJCMa3GhoTHOrwQ";

export async function requestPermissionAndToken() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) return await saveTokenToFirestore(currentToken);
        }
        return false;
    } catch (err) { console.error('An error occurred while getting token:', err); return false; }
}

async function saveTokenToFirestore(token) {
    const tokenDocRef = doc(db, 'fcm_tokens', token);
    try {
        await setDoc(tokenDocRef, { token: token, createdAt: serverTimestamp() }, { merge: true });
        console.log('Token saved successfully!');
        return true;
    } catch (err) { console.error('Error saving token:', err); return false; }
}