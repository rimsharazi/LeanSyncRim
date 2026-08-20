// ============================================================
// LEAN SYNC RIM — FIREBASE CLOUD MESSAGING SERVICE WORKER
// ============================================================

importScripts(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

firebase.initializeApp({
    apiKey: "AIzaSyAbNKJnV6FHdd5GuvN-8RhQRQJkP1TfnA",
    authDomain: "leansyncrim.firebaseapp.com",
    projectId: "leansyncrim",
    storageBucket: "leansyncrim.firebasestorage.app",
    messagingSenderId: "91361714814",
    appId: "1:91361714814:web:f855ffa33e9c2d02a62e2f"
});


// ============================================================
// FIREBASE MESSAGING
// ============================================================

const messaging = firebase.messaging();


// ============================================================
// BACKGROUND NOTIFICATIONS
// ============================================================

messaging.onBackgroundMessage(function (payload) {

    console.log(
        "[firebase-messaging-sw.js] Background message:",
        payload
    );

    const notificationTitle =
        payload.notification?.title ||
        payload.data?.title ||
        "Lean Sync Coach";

    const notificationOptions = {

        body:
            payload.notification?.body ||
            payload.data?.body ||
            "Your coach has something to tell you.",

        icon:
            payload.notification?.icon ||
            "/favicon.ico",

        badge:
            "/favicon.ico",

        tag:
            payload.data?.tag ||
            "lean-sync-notification",

        data: {

            url:
                payload.data?.url ||
                "/",

            notificationType:
                payload.data?.notificationType ||
                "general"
        },

        requireInteraction:
            payload.data?.requireInteraction === "true"
    };


    return self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );
});


// ============================================================
// NOTIFICATION CLICK
// ============================================================

self.addEventListener(
    "notificationclick",
    function (event) {

        event.notification.close();

        const notificationData =
            event.notification.data || {};

        const targetUrl =
            notificationData.url || "/";


        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            })

            .then(function (clientList) {

                // If the website is already open,
                // bring it to the front.

                for (
                    const client of clientList
                ) {

                    if (
                        "focus" in client &&
                        client.url.includes(
                            self.location.origin
                        )
                    ) {

                        return client.focus();
                    }
                }


                // Otherwise open the website.

                if (
                    clients.openWindow
                ) {

                    return clients.openWindow(
                        targetUrl
                    );
                }

            })

        );

    }
);


// ============================================================
// SERVICE WORKER INSTALL
// ============================================================

self.addEventListener(
    "install",
    function () {

        console.log(
            "Lean Sync Coach service worker installed."
        );

        self.skipWaiting();

    }
);


// ============================================================
// SERVICE WORKER ACTIVATION
// ============================================================

self.addEventListener(
    "activate",
    function (event) {

        console.log(
            "Lean Sync Coach service worker activated."
        );

        event.waitUntil(
            self.clients.claim()
        );

    }
);
