const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const RESEND_API_KEY = 're_Jo35xAob_BZWbKF7oSCZxudzdRYdzXRdk';

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  const { from, to, subject, html } = req.body;

  if (!from || !to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: from, to, subject, html' });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, html })
    });

    const result = await response.json();

    if (response.ok) {
      // Save to Firestore
      await admin.firestore().collection('notifications').add({
        from,
        to,
        subject,
        body: html,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        resendId: result.id || ''
      });

      res.status(200).json({ success: true, id: result.id });
    } else {
      res.status(500).json({ error: result.message || result.error || 'Resend API error' });
    }
  } catch (e) {
    console.error('sendEmail error:', e);
    res.status(500).json({ error: e.message });
  }
});
