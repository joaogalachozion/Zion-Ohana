// Edge Function: envia recibo/agradecimento de doação via Resend.
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  (obrigatório)
//   ADMIN_EMAIL     (e-mail administrativo que recebe a cópia)
//   EMAIL_FROM      (opcional; ex.: "Zion Ohana <doacoes@zionchurch.org.br>")
// Chamada pelo app após registrar a doação (fire-and-forget).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const brl = (n: number) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// não enviar para os e-mails fictícios dos logins seedados
const isEmailReal = (e?: string) =>
  !!e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !e.toLowerCase().endsWith('@zion-ohana.com');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { igreja, pastorNome, pastorEmail, tipo, valor, data } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');
    const FROM = Deno.env.get('EMAIL_FROM') || 'Zion Ohana <onboarding@resend.dev>';

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurado' }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const tipoLabel = tipo === 'DPS' ? 'DPS · Dízimo do Pastor Sênior' : 'OF · Ohana Fee';
    const valorFmt = brl(valor);
    const dataFmt = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

    const to: string[] = [];
    if (isEmailReal(pastorEmail)) to.push(pastorEmail);
    if (ADMIN_EMAIL) to.push(ADMIN_EMAIL);
    if (to.length === 0) {
      return new Response(JSON.stringify({ skipped: 'sem destinatário válido' }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#15302c">
        <div style="background:#00312B;padding:24px 28px;border-radius:14px 14px 0 0">
          <div style="color:#C5FFCE;font-size:12px;letter-spacing:3px;font-weight:700">ZION OHANA · REDE DE IGREJAS</div>
          <div style="color:#fff;font-size:22px;font-weight:700;margin-top:8px">Recebemos sua doação 🙏</div>
        </div>
        <div style="background:#FCF8F5;padding:24px 28px;border-radius:0 0 14px 14px">
          <p style="font-size:15px;line-height:1.6">
            ${pastorNome ? `Olá, <b>${pastorNome}</b>! ` : 'Olá! '}
            Muito obrigado pela sua contribuição à rede Ohana. Recebemos seu registro e ele está
            <b>aguardando confirmação</b> da nossa equipe. Segue a cópia das informações enviadas:
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">
            <tr><td style="padding:8px 0;color:#7d918c">Igreja</td><td style="padding:8px 0;text-align:right;font-weight:600">${igreja || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#7d918c">Tipo</td><td style="padding:8px 0;text-align:right;font-weight:600">${tipoLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#7d918c">Valor</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#00312B">${valorFmt}</td></tr>
            <tr><td style="padding:8px 0;color:#7d918c">Data</td><td style="padding:8px 0;text-align:right;font-weight:600">${dataFmt}</td></tr>
          </table>
          <p style="font-size:13px;color:#7d918c;margin-top:18px">
            Este é um e-mail automático de confirmação de recebimento. Que Deus abençoe! 🌱<br/>
            Zion Global • Dunamis Movement
          </p>
        </div>
      </div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to,
        subject: `Doação recebida — ${igreja || 'Rede Ohana'} · ${valorFmt}`,
        html,
      }),
    });
    const out = await r.json();
    return new Response(JSON.stringify({ ok: r.ok, result: out }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
