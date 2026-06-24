const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const RESEND_API_KEY = 're_Jo35xAob_BZWbKF7oSCZxudzdRYdzXRdk';
const resend = new Resend(RESEND_API_KEY);

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  // CORS headers (set before any logic)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { from, to, subject, html } = req.body;

  if (!from || !to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: from, to, subject, html' });
    return;
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      res.status(500).json({ error: result.error.message || JSON.stringify(result.error) });
      return;
    }

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
  } catch (e) {
    console.error('sendEmail error:', e);
    res.status(500).json({ error: e.message });
  }
});
