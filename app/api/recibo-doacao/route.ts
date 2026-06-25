// Recibo de doação por e-mail via SMTP (provedor configurável — Brevo, Gmail, etc.).
// Não precisa de verificação de domínio quando o remetente é verificado no provedor.
// Variáveis no Vercel:
//   SMTP_HOST  = ex.: smtp-relay.brevo.com   (padrão: smtp.gmail.com)
//   SMTP_PORT  = ex.: 587                      (padrão: 465)
//   SMTP_USER  = login SMTP do provedor
//   SMTP_PASS  = chave/senha SMTP do provedor
//   EMAIL_FROM = ohana@zionchurch.org.br       (remetente verificado)
//   ADMIN_EMAIL (opcional) = cópia (padrão: EMAIL_FROM)
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

const brl = (n: number) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// não enviar para os e-mails fictícios dos logins seedados
const isEmailReal = (e?: string) =>
  !!e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !e.toLowerCase().endsWith('@zion-ohana.com');

export async function POST(req: Request) {
  try {
    const { igreja, pastorNome, pastorEmail, tipo, valor, data } = await req.json();

    const HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
    const PORT = Number(process.env.SMTP_PORT || 465);
    const USER = process.env.SMTP_USER;
    const PASS = process.env.SMTP_PASS;
    const FROM = process.env.EMAIL_FROM || (USER ? `Zion Ohana <${USER}>` : '');
    const ADMIN = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'ohana@zionchurch.org.br';

    if (!USER || !PASS) {
      return NextResponse.json({ error: 'SMTP_USER/SMTP_PASS ausentes no ambiente' }, { status: 200 });
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

    const transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465,
      auth: { user: USER, pass: PASS },
    });

    const info = await transporter.sendMail({
      from: FROM || `Zion Ohana <${USER}>`,
      to,
      subject: `Doação recebida — ${igreja || 'Rede Ohana'} · ${valorFmt}`,
      html,
    });

    return NextResponse.json({ ok: true, id: info.messageId, to });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
