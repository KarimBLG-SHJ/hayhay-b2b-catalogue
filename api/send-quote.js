// Hayhay B2B — Quotation Request Handler
// Uses Resend (resend.com) to send emails directly from Vercel
//
// Setup (5 min):
//   1. Sign up free at https://resend.com
//   2. Go to API Keys → Create key → copy it
//   3. In Vercel dashboard → Settings → Environment Variables
//      → Add: RESEND_API_KEY = re_xxxxxxxxxxxx
//   4. Redeploy → done ✓

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { email, phone, business, products, notes } = body;

  if (!email || !phone || !products) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500 });
  }

  // Format product list as HTML table rows
  const productRows = products
    .split('\n')
    .filter(Boolean)
    .map(line => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${line}</td></tr>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#D8614C;padding:20px 28px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:2px;">HAYHAY</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">New B2B Quotation Request</p>
      </div>

      <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#D8614C;text-transform:uppercase;letter-spacing:1px;">Contact Details</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:6px 0;width:110px;color:#888;font-size:13px;">Email</td><td style="font-size:14px;font-weight:600;">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#888;font-size:13px;">Phone</td><td style="font-size:14px;font-weight:600;">${phone}</td></tr>
          <tr><td style="padding:6px 0;color:#888;font-size:13px;">Business</td><td style="font-size:14px;">${business || '—'}</td></tr>
        </table>

        <h2 style="margin:0 0 12px;font-size:16px;color:#D8614C;text-transform:uppercase;letter-spacing:1px;">Selected Products</h2>
        <table style="width:100%;border-collapse:collapse;background:#fdf8f6;border-radius:6px;margin-bottom:24px;font-size:13px;">
          ${productRows}
        </table>

        ${notes ? `
        <h2 style="margin:0 0 10px;font-size:16px;color:#D8614C;text-transform:uppercase;letter-spacing:1px;">Notes</h2>
        <p style="background:#fdf8f6;padding:14px 16px;border-radius:6px;font-size:13px;line-height:1.6;margin:0 0 24px;">${notes.replace(/\n/g, '<br>')}</p>
        ` : ''}

        <p style="margin:0;font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:16px;">
          Sent via Hayhay B2B Catalogue 2026 · hayhaybakery.com
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hayhay B2B Catalogue <onboarding@resend.dev>',
        to:   ['partner@hayhaybakery.com'],
        reply_to: email,
        subject:  `Quotation Request — ${business || email}`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Resend API error');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
