export interface Env {
	RESEND_API_KEY: string;
}

// الأمان: لا `*` — نُعيد أصل النطاق فقط إذا كان ضمن القائمة؛ وإلا لا نرسل
// Access-Control-Allow-Origin فيمنع المتصفح الرد. نداءات الخادم (بلا Origin) لا تتأثر.
const ALLOWED_ORIGINS = [
	'https://epluscenter.com',
	'https://www.epluscenter.com',
	'http://localhost:5500',
	'http://127.0.0.1:5500',
	'http://localhost:8080',
	'http://localhost:3000',
	'http://localhost:5173',
];

function resolveOrigin(request: Request): string | null {
	const origin = request.headers.get('origin') || '';
	if (!origin) return null;
	return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function corsHeadersFor(request: Request): Record<string, string> {
	const origin = resolveOrigin(request);
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Vary': 'Origin',
	};
	if (origin) headers['Access-Control-Allow-Origin'] = origin;
	return headers;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = corsHeadersFor(request);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ error: 'Method not allowed' }), {
				status: 405,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		try {
			const { from, to, subject, html } = await request.json() as any;

			if (!from || !to || !subject || !html) {
				return new Response(JSON.stringify({ error: 'Missing required fields' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			const resendRes = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ from, to, subject, html }),
			});

			const result = await resendRes.json() as any;

			if (resendRes.ok) {
				return new Response(JSON.stringify({ success: true, id: result.id }), {
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			} else {
				return new Response(JSON.stringify({ success: false, error: result }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
		} catch (e: any) {
			return new Response(JSON.stringify({ success: false, error: e.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
