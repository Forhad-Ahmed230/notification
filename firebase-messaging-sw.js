importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");
const firebaseConfig = { apiKey: "AIzaSyAasfaqKX6_YerMvNNqMEkLhyHQKCkUCYY", authDomain: "notification-6e1fe.firebaseapp.com", projectId: "notification-6e1fe", storageBucket: "notification-6e1fe.appspot.com", messagingSenderId: "466180249875", appId: "1:466180249875:web:a8cdea1129ecb9d20b62e6", measurementId: "G-LYGLEQDE0M" };

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon,
        image: payload.data.image,
        badge: payload.data.badge,
        data: { url: payload.data.url }
    };
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    const urlToOpen = event.notification.data.url;
    event.notification.close();
    event.waitUntil(clients.openWindow(urlToOpen));
});