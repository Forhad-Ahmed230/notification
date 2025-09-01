const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

// Environment Variable থেকে JSON ডেটা পড়া হবে
const serviceAccountString = process.env.SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
    console.error('FATAL ERROR: SERVICE_ACCOUNT_KEY environment variable is not set.');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountString);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(bodyParser.json());
app.use(cors());

const siteUrl = 'https://forhad-ahmed230.github.io';

app.get('/stats', async (req, res) => {
    try {
        const snapshot = await db.collection('fcm_tokens').get();
        res.status(200).json({ subscriberCount: snapshot.size });
    } catch (error) { console.error('Error fetching stats:', error); res.status(500).json({ message: 'Error fetching stats.' }); }
});

app.get('/subscribers', async (req, res) => {
    try {
        const snapshot = await db.collection('fcm_tokens').get();
        const tokens = snapshot.docs.map(doc => doc.id);
        res.status(200).json(tokens);
    } catch (error) { console.error('Error fetching subscribers:', error); res.status(500).json({ message: 'Error fetching subscribers.' }); }
});

app.post('/send', async (req, res) => {
    const { title, body, link, iconUrl, imageUrl, targetToken } = req.body;
    if (!title || !body || !link) { return res.status(400).json({ message: 'Title, body, and link are required.' }); }

    const messagePayload = {
        data: { 
            title, body, link,
            icon: iconUrl || `${siteUrl}/facebook logo.png`,
            image: imageUrl || '',
            badge: `${siteUrl}/badge-icon.png`,
        },
        android: { priority: 'high' },
        webpush: { headers: { Urgency: 'high' } },
    };

    try {
        if (targetToken) {
            await admin.messaging().send({ ...messagePayload, token: targetToken });
            return res.status(200).json({ message: `Successfully sent notification to 1 subscriber.` });
        }
        
        const tokensSnapshot = await db.collection('fcm_tokens').get();
        const tokens = tokensSnapshot.docs.map(doc => doc.id);
        if (tokens.length === 0) { return res.status(200).json({ message: 'No active subscribers found.' }); }

        const response = await admin.messaging().sendEachForMulticast({ ...messagePayload, tokens: tokens });
        
        const tokensToDelete = [];
        response.responses.forEach((result, index) => {
            if (!result.success && result.error.code === 'messaging/registration-token-not-registered') {
                tokensToDelete.push(tokens[index]);
            }
        });
        if (tokensToDelete.length > 0) {
            const deletePromises = tokensToDelete.map(token => db.collection('fcm_tokens').doc(token).delete());
            await Promise.all(deletePromises);
            console.log(`Auto-cleaned ${tokensToDelete.length} invalid tokens during send.`);
        }
        
        res.status(200).json({ message: `Successfully sent messages to ${response.successCount} of ${tokens.length} subscribers.`, successCount: response.successCount, failureCount: response.failureCount });
    } catch (error) {
        console.error('Error sending notification:', error);
        if (targetToken && error.code === 'messaging/registration-token-not-registered') {
             await db.collection('fcm_tokens').doc(targetToken).delete();
             console.log(`Cleaned up invalid token: ${targetToken}`);
             return res.status(400).json({ message: 'Failed: User has unsubscribed. Token removed.' });
        }
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.post('/cleanup-tokens', async (req, res) => {
    try {
        const snapshot = await db.collection('fcm_tokens').get();
        const tokens = snapshot.docs.map(doc => doc.id);
        if (tokens.length === 0) { return res.status(200).json({ message: 'No tokens to check.' }); }

        const response = await admin.messaging().sendEachForMulticast({ tokens, data: { dryRun: 'true' } }, true);

        const tokensToDelete = [];
        response.responses.forEach((result, index) => {
            if (!result.success && result.error.code === 'messaging/registration-token-not-registered') {
                tokensToDelete.push(tokens[index]);
            }
        });

        if (tokensToDelete.length > 0) {
            const deletePromises = tokensToDelete.map(token => db.collection('fcm_tokens').doc(token).delete());
            await Promise.all(deletePromises);
            console.log(`Cleanup complete. ${tokensToDelete.length} invalid tokens removed.`);
            return res.status(200).json({ message: `Cleanup complete. ${tokensToDelete.length} invalid tokens removed.` });
        } else {
            return res.status(200).json({ message: 'No invalid tokens found to delete.' });
        }
    } catch (error) {
        console.error('Error during token cleanup:', error);
        res.status(500).json({ message: 'Internal server error during cleanup.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});