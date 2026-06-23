'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Lancamento } from '@/lib/types';
import { Check, Trash2, Clock, Inbox } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE', LARANJA = '#FE5000';
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Confirmacoes() {
  const [pend, setPend] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const [{ data: lans }, { data: igs }] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('status', '⏳ Pendente').order('created_at', { ascending: false }),
      supabase.from('igrejas').select('id, nome'),
    ]);
    setPend(lans || []);
    setIgrejas(Object.fromEntries((igs || []).map((i: { id: string; nome: string }) => [i.id, i.nome])));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function confirmar(l: Lancamento) {
    setBusy(l.id!);
    await supabase.from('lancamentos').update({ status: '✅ Pago' }).eq('id', l.id);
    await load(); setBusy(null);
  }
  async function excluir(l: Lancamento) {
    setBusy(l.id!);
    await supabase.from('lancamentos').delete().eq('id', l.id);
    await load(); setBusy(null);
  }

  if (loading) return <div className="h-64 flex items-center justify-center font-medium" style={{ color: TEAL }}>Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: TEAL }}>Confirmações de Doação</h1>
        <p className="text-sm text-gray-500">
          Doações enviadas pelos pastores aguardando confirmação manual (banco).
        </p>
      </div>

      {pend.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 flex flex-col items-center gap-3">
          <Inbox size={36} className="opacity-40" />
          Nenhuma doação pendente de confirmação.
        </div>
      ) : (
        <div className="space-y-3">
          {pend.map(l => {
            const dps = Number(l.dps) || 0, of = Number(l.of) || 0;
            const tipo = dps > 0 ? 'DPS · Dízimo do Pastor Sênior' : 'OF · Ohana Fee';
            const valor = dps + of;
            return (
              <div key={l.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FFF3E9' }}>
                    <Clock size={18} style={{ color: LARANJA }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate" style={{ color: TEAL }}>
                      {igrejas[l.igreja_id] || l.igreja_id} · {brl(valor)}
                    </div>
                    <div className="text-xs text-gray-500">{tipo} · ref. {l.periodo}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => confirmar(l)} disabled={busy === l.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                    style={{ background: TEAL, opacity: busy === l.id ? 0.6 : 1 }}>
                    <Check size={15} /> Confirmar
                  </button>
                  <button onClick={() => excluir(l)} disabled={busy === l.id}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
