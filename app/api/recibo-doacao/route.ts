import { NextResponse } from 'next/server';

const brl = (n: number) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// não enviar para os e-mails fictícios dos logins seedados
const isEmailReal = (e?: string) =>
  !!e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !e.toLowerCase().endsWith('@zion-ohana.com');

export async function POST(req: Request) {
  try {
    const { igreja, pastorNome, pastorEmail, tipo, valor, data } = await req.json();

    const KEY = process.env.RESEND_API_KEY;
    const ADMIN = process.env.ADMIN_EMAIL || 'ohana@zionchurch.org.br';
    const FROM = process.env.EMAIL_FROM || 'Zion Ohana <onboarding@resend.dev>';

    if (!KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY ausente no ambiente' }, { status: 200 });
    }

    const to: string[] = [];
    if (isEmailReal(pastorEmail)) to.push(pastorEmail);
    if (ADMIN) to.push(ADMIN);
    if (to.length === 0) return NextResponse.json({ skipped: 'sem destinatário válido' });

    const tipoLabel = tipo === 'DPS' ? 'DPS · Dízimo do Pastor Sênior' : 'OF · Ohana Fee';
    const valorFmt = brl(valor);
    const dataFmt = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

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
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to,
        subject: `Doação recebida — ${igreja || 'Rede Ohana'} · ${valorFmt}`,
        html,
      }),
    });
    const out = await r.json();
    return NextResponse.json({ ok: r.ok, result: out });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 200 });
  }
}
