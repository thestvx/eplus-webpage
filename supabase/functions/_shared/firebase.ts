const FIREBASE_PROJECT_ID = 'eplus-center-39';
const DEFAULT_WEB_API_KEY = 'AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo';

export interface VerifiedUser {
  uid: string;
  email?: string;
}

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedUser | null> {
  if (!idToken) return null;
  const key = Deno.env.get('FIREBASE_WEB_API_KEY') || DEFAULT_WEB_API_KEY;
  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/tokeninfo?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id_token=${encodeURIComponent(idToken)}`,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.user_id || !data.aud || data.aud !== FIREBASE_PROJECT_ID) return null;
    return { uid: data.user_id, email: data.email || '' };
  } catch (e) {
    console.error('[verifyFirebaseToken]', e);
    return null;
  }
}

export function bearerToken(req: Request): string {
  const auth = req.headers.get('Authorization') || '';
  return auth.replace(/^Bearer\s+/i, '').trim();
}
