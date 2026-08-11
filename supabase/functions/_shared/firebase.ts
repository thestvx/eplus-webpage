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
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = Array.isArray(data.users) ? data.users[0] : null;
    if (!user || !user.localId) return null;
    return { uid: String(user.localId), email: user.email ? String(user.email) : '' };
  } catch (e) {
    console.error('[verifyFirebaseToken]', e);
    return null;
  }
}

export function bearerToken(req: Request): string {
  const auth = req.headers.get('Authorization') || '';
  return auth.replace(/^Bearer\s+/i, '').trim();
}
