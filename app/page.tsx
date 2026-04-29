'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase, periodoNum, formatBRL } from '@/lib/supabase';
import type { Lancamento, Igreja } from '@/lib/types';
import KPICard from '@/components/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';

const PERIODS = Array.from({ length: 48 }, (_, i) => {
  const d = new Date(2023, i, 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
});

const PIE_COLORS = ['#FE5000','#1F2A44','#C5FFCE','#002624','#00312B',
                    '#6B7280','#FFF0EB','#D6E4F0','#E8FFF0','#FCF8F5','#374151','#9CA3AF'];

export default function Dashboard() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState('01/2023');
  const [ate, setAte] = useState('03/2026');
  const [churchFilter, setChurchFilter] = useState('');

  useEffect(() => {
    async function load() {
      const [{ data: lans }, { data: igs }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('periodo_num'),
        supabase.from('igrejas').select('*').order('id'),
      ]);
      setLancamentos(lans || []);
      setIgrejas(igs || []);
      setLoading(false);
    }
    load();
  }, []);

  const igrejaNome = useMemo(() => {
    const m: Record<string, string> = {};
    igrejas.forEach(ig => { m[ig.id] = ig.nome; });
    return m;
  }, [igrejas]);

  const filtered = useMemo(() => {
    const pns = periodoNum(de);
    const pne = periodoNum(ate);
    return lancamentos.filter(l =>
      l.periodo_num >= pns && l.periodo_num <= pne &&
      l.status === '✅ Pago' &&
      (churchFilter === '' || l.igreja_id === churchFilter)
    );
  }, [lancamentos, de, ate, churchFilter]);

  const totalDPS = filtered.reduce((s, l) => s + (l.dps || 0), 0);
  const totalOF  = filtered.reduce((s, l) => s + (l.of  || 0), 0);
  const total    = totalDPS + totalOF;

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, { periodo: string; DPS: number; OF: number }> = {};
    filtered.forEach(l => {
      if (!map[l.periodo]) map[l.periodo] = { periodo: l.periodo, DPS: 0, OF: 0 };
      map[l.periodo].DPS += l.dps || 0;
      map[l.periodo].OF  += l.of  || 0;
    });
    return Object.values(map).sort((a, b) => periodoNum(a.periodo) - periodoNum(b.periodo));
  }, [filtered]);

  // Pie: by church
  const byChurchOF = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => {
      map[l.igreja_id] = (map[l.igreja_id] || 0) + (l.of || 0);
    });
    return Object.entries(map)
      .filter(([,v]) => v > 0)
      .map(([id, value]) => ({ name: igrejaNome[id] || id, value }))
      .sort((a,b) => b.value - a.value);
  }, [filtered, igrejaNome]);

  const byChurchDPS = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => {
      map[l.igreja_id] = (map[l.igreja_id] || 0) + (l.dps || 0);
    });
    return Object.entries(map)
      .filter(([,v]) => v > 0)
      .map(([id, value]) => ({ name: igrejaNome[id] || id, value }))
      .sort((a,b) => b.value - a.value);
  }, [filtered, igrejaNome]);

  const ofVsDps = [
    { name: 'OF (Ohana Fee)', value: totalOF  },
    { name: 'DPS',            value: totalDPS },
  ].filter(d => d.value > 0);

  const igrejasFiltro = igrejas.filter(ig =>
    ['✅ Ativo','⚠️ Revisão'].includes(ig.status)
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg font-medium" style={{ color: '#002624' }}>Carregando...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#002624' }}>Dashboard Financeiro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rede de Igrejas — DPS & OF (Ohana Fee)</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#002624' }}>DE</label>
          <select value={de} onChange={e => setDe(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#C5FFCE' } as React.CSSProperties}>
            {PERIODS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#002624' }}>ATÉ</label>
          <select value={ate} onChange={e => setAte(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
            {PERIODS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#002624' }}>IGREJA</label>
          <select value={churchFilter} onChange={e => setChurchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none min-w-[200px]">
            <option value="">Todas as igrejas</option>
            {igrejasFiltro.map(ig => (
              <option key={ig.id} value={ig.id}>{ig.nome}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-400 self-center">
          {filtered.length} lançamentos no período
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Total Arrecadado" value={total}    bg="#002624" fg="#C5FFCE" accent="#FE5000" />
        <KPICard label="Total DPS"        value={totalDPS} bg="#FE5000" fg="#FFFFFF" />
        <KPICard label="Total OF (Ohana)" value={totalOF}  bg="#1F2A44" fg="#C5FFCE" />
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold mb-4" style={{ color: '#002624' }}>
          RECEITA MENSAL — DPS vs OF
          {churchFilter && igrejas.find(ig => ig.id === churchFilter) &&
            ` — ${igrejas.find(ig => ig.id === churchFilter)?.nome}`}
        </h2>
        {monthlyData.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Nenhum dado no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="DPS" fill="#FE5000" radius={[3,3,0,0]} />
              <Bar dataKey="OF"  fill="#1F2A44" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-3 gap-4">
        <PieCard title="OF por Igreja"   data={byChurchOF} />
        <PieCard title="DPS por Igreja"  data={byChurchDPS} />
        <PieCard title="OF vs DPS Total" data={ofVsDps} colors={['#1F2A44','#FE5000']} />
      </div>
    </div>
  );
}

function PieCard({ title, data, colors }: {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  const cols = colors || PIE_COLORS;
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold mb-3" style={{ color: '#002624' }}>{title}</h2>
      {data.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">Sem dados</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={cols[i % cols.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {data.map((d, i) => {
              const total = data.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: cols[i % cols.length] }} />
                  <span className="truncate text-gray-600 flex-1">{d.name}</span>
                  <span className="font-medium text-gray-800">{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
