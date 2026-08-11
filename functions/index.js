const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

// ── الأمان: لا مفاتيح في الكود إطلاقاً ─────────────────────────
// تُقرأ من متغير البيئة RESEND_API_KEY أو من Firebase functions config.
// الإعداد: firebase functions:config:set resend.apikey="..."  أو
//          export RESEND_API_KEY="..." (gen2 / Cloud Run).
const ALLOWED_ORIGINS = [
  'https://epluscenter.com',
  'https://www.epluscenter.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

function resolveResendApiKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const cfg = functions.config();
  if (cfg.resend && cfg.resend.apikey) return cfg.resend.apikey;
  return '';
}

const RESEND_API_KEY = resolveResendApiKey();
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!RESEND_API_KEY) {
  console.error('[sendEmail] RESEND_API_KEY is not configured (env or `firebase functions:config:set resend.apikey=...`)');
}

function allowedOrigin(req) {
  const origin = (req.get && req.get('Origin')) || req.headers.origin || '';
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function corsHeadersFor(req) {
  const origin = allowedOrigin(req);
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  // CORS headers (set before any logic)
  res.set(corsHeadersFor(req));

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

  if (!resend) {
    console.error('[sendEmail] RESEND_API_KEY is not configured');
    res.status(500).json({ error: 'Email service is not configured.' });
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
