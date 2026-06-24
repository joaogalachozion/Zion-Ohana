'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getPerfil } from '@/lib/supabase-auth';
import type { Lancamento } from '@/lib/types';
import { Plus } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE', LARANJA = '#FE5000';
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MinhasDoacoes() {
  const [lans, setLans] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const perfil = await getPerfil();
      if (!perfil?.igreja_id) { setLoading(false); return; }
      const { data } = await supabase.from('lancamentos').select('*')
        .eq('igreja_id', perfil.igreja_id).order('periodo_num', { ascending: false });
      setLans(data || []); setLoading(false);
    })();
  }, []);

  const tot = useMemo(() => {
    const dps = lans.reduce((s, l) => s + (Number(l.dps) || 0), 0);
    const of = lans.reduce((s, l) => s + (Number(l.of) || 0), 0);
    return { dps, of, total: dps + of, meses: lans.length };
  }, [lans]);

  if (loading) return <div className="h-64 flex items-center justify-center font-medium" style={{ color: TEAL }}>Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: TEAL }}>Minhas Doações</h1>
          <p className="text-sm text-gray-500">Histórico de DPS (Dízimo do Pastor Sênior) e OF (Ohana Fee)</p>
        </div>
        <Link href="/painel/nova-doacao"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap hover:opacity-90"
          style={{ background: LARANJA }}>
          <Plus size={16} /> Nova Doação
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Total semeado" value={brl(tot.total)} accent />
        <Kpi label="DPS acumulado" value={brl(tot.dps)} />
        <Kpi label="OF acumulado" value={brl(tot.of)} />
        <Kpi label="Meses registrados" value={String(tot.meses)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: TEAL }}>
              {['Período', 'DPS', 'OF', 'Total', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: MINT }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lans.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum lançamento registrado ainda.</td></tr>
            )}
            {lans.map((l, i) => {
              const dps = Number(l.dps) || 0, of = Number(l.of) || 0;
              const pendente = l.status === '⏳ Pendente';
              return (
                <tr key={l.id ?? i} className="border-t border-gray-100"
                  style={{ background: pendente ? '#FFF8EC' : undefined }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: TEAL }}>{l.periodo}</td>
                  <td className="px-4 py-2.5" style={{ color: dps > 0 ? TEAL : '#cbd5d1' }}>{brl(dps)}</td>
                  <td className="px-4 py-2.5" style={{ color: of > 0 ? TEAL : '#cbd5d1' }}>{brl(of)}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: TEAL }}>{brl(dps + of)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="px-2 py-0.5 rounded-full font-medium"
                      style={{ background: pendente ? '#FFE3C2' : '#D4EDDA', color: pendente ? '#8a4b12' : '#1F7A3A' }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: accent ? TEAL : '#fff', borderColor: accent ? TEAL : '#e7eee9' }}>
      <div className="text-xs" style={{ color: accent ? MINT : '#9ca3af' }}>{label}</div>
      <div className="text-lg font-bold mt-1" style={{ color: accent ? '#fff' : TEAL }}>{value}</div>
    </div>
  );
}
