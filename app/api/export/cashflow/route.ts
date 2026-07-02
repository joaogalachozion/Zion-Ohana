// Exportação só-leitura para o Zion Global CashFlow.
// Protegido por token: header  Authorization: Bearer <EXPORT_TOKEN>
// Variável no Vercel: EXPORT_TOKEN = um segredo forte que você define.
// Retorna a view v_zion_cashflow_export (amount = valor BRUTO, só lançamentos confirmados).
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = process.env.EXPORT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Exportação não configurada (EXPORT_TOKEN ausente).' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('v_zion_cashflow_export')
    .select('church_name, amount, competence_month, currency')
    .order('competence_month', { ascending: true })
    .order('church_name', { ascending: true })
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // amount vem como string do Postgres (numeric) -> número
  const rows = (data || []).map((r: any) => ({
    church_name: r.church_name,
    amount: Number(r.amount),
    competence_month: r.competence_month, // YYYY-MM-DD
    currency: r.currency,
  }));

  return NextResponse.json({ count: rows.length, data: rows });
}
