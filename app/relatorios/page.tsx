'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase, periodoNum, formatBRL } from '@/lib/supabase';
import type { Lancamento, Igreja } from '@/lib/types';
import { FileDown, Printer } from 'lucide-react';

const PERIODS = Array.from({ length: 48 }, (_, i) => {
  const d = new Date(2023, i, 1);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
});

export default function Relatorios() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState('01/2025');
  const [ate, setAte] = useState('03/2026');
  const [filterIgreja, setFilterIgreja] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function load() {
      const [{ data: lans }, { data: igs }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('periodo_num,igreja_id'),
        supabase.from('igrejas').select('*').order('id'),
      ]);
      setLancamentos(lans || []);
      setIgrejas(igs || []);
      setLoading(false);
    }
    load();
  }, []);

  const igMap = useMemo(() => {
    const m: Record<string,string> = {};
    igrejas.forEach(ig => { m[ig.id] = ig.nome; });
    return m;
  }, [igrejas]);

  const filtered = useMemo(() => {
    const pns = periodoNum(de);
    const pne = periodoNum(ate);
    return lancamentos.filter(l =>
      l.periodo_num >= pns && l.periodo_num <= pne &&
      (!filterIgreja || l.igreja_id === filterIgreja) &&
      (!filterStatus || l.status === filterStatus)
    );
  }, [lancamentos, de, ate, filterIgreja, filterStatus]);

  // Summary by period
  const byPeriod = useMemo(() => {
    const map: Record<string,{periodo:string,dps:number,of:number,count:number}> = {};
    filtered.forEach(l => {
      if (!map[l.periodo]) map[l.periodo]={periodo:l.periodo,dps:0,of:0,count:0};
      map[l.periodo].dps   += l.dps||0;
      map[l.periodo].of    += l.of||0;
      map[l.periodo].count += 1;
    });
    return Object.values(map).sort((a,b) => periodoNum(a.periodo)-periodoNum(b.periodo));
  }, [filtered]);

  // Summary by church
  const byChurch = useMemo(() => {
    const map: Record<string,{id:string,nome:string,dps:number,of:number,count:number}> = {};
    filtered.forEach(l => {
      if (!map[l.igreja_id]) map[l.igreja_id]={id:l.igreja_id,nome:igMap[l.igreja_id]||l.igreja_id,dps:0,of:0,count:0};
      map[l.igreja_id].dps   += l.dps||0;
      map[l.igreja_id].of    += l.of||0;
      map[l.igreja_id].count += 1;
    });
    return Object.values(map).sort((a,b) => (b.dps+b.of)-(a.dps+a.of));
  }, [filtered, igMap]);

  const totalDPS = filtered.reduce((s,l) => s+(l.dps||0), 0);
  const totalOF  = filtered.reduce((s,l) => s+(l.of||0), 0);

  function print() { window.print(); }

  function exportCSV() {
    const header = 'Período,Igreja,Valor DPS,Valor OF,Total,Status';
    const rows = filtered.map(l =>
      `${l.periodo},${igMap[l.igreja_id]||l.igreja_id},${l.dps||0},${l.of||0},${(l.dps||0)+(l.of||0)},${l.status}`
    );
    const blob = new Blob([header+'\n'+rows.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url;
    a.download=`zion-relatorio-${de.replace('/','_')}-${ate.replace('/','_')}.csv`;
    a.click();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-lg font-medium" style={{ color:'#002624' }}>Carregando...</div>;

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:'#002624' }}>Relatórios</h1>
          <p className="text-sm text-gray-500">Exporte e imprima relatórios filtrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            <FileDown size={16} /> Exportar CSV
          </button>
          <button onClick={print}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
            style={{ background:'#002624' }}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-6">
        <div className="text-2xl font-bold" style={{ color:'#002624' }}>ZION GLOBAL</div>
        <div className="text-lg font-medium text-gray-600">Relatório Financeiro — Rede de Igrejas</div>
        <div className="text-sm text-gray-500 mt-1">Período: {de} a {ate}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          Gerado em {new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'})}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end print:hidden">
        {[
          { label:'DE', value:de, onChange:setDe },
          { label:'ATÉ', value:ate, onChange:setAte },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <label className="block text-xs font-semibold mb-1 text-gray-600">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {PERIODS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">IGREJA</label>
          <select value={filterIgreja} onChange={e => setFilterIgreja(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="">Todas</option>
            {igrejas.map(ig => <option key={ig.id} value={ig.id}>{ig.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">STATUS</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {['✅ Pago','⏳ Pendente','🔴 Em Atraso','🔍 Em Validação','↩️ Estornado'].map(s =>
              <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Arrecadado', value:totalDPS+totalOF, bg:'#002624', fg:'#C5FFCE' },
          { label:'Total DPS',        value:totalDPS,         bg:'#FE5000', fg:'#FFFFFF' },
          { label:'Total OF (Ohana)', value:totalOF,          bg:'#1F2A44', fg:'#C5FFCE' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 text-center" style={{ background:k.bg }}>
            <div className="text-xs opacity-60 mb-1" style={{ color:k.fg }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color:k.fg }}>{formatBRL(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Por Período */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ background:'#002624' }}>
          <h2 className="text-sm font-bold" style={{ color:'#C5FFCE' }}>RESUMO POR PERÍODO</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Período','Lançamentos','Total DPS','Total OF','Total Geral','DPS %','OF %'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byPeriod.map((row, i) => {
              const tot = row.dps + row.of;
              const grandTotal = totalDPS + totalOF;
              return (
                <tr key={row.periodo} className={i%2===0?'':'bg-gray-50'} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td className="px-4 py-2.5 font-semibold text-gray-700">{row.periodo}</td>
                  <td className="px-4 py-2.5 text-gray-500">{row.count}</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color:'#FE5000' }}>{formatBRL(row.dps)}</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color:'#1F2A44' }}>{formatBRL(row.of)}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800">{formatBRL(tot)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{grandTotal>0?((row.dps/grandTotal)*100).toFixed(1)+'%':'—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{grandTotal>0?((row.of/grandTotal)*100).toFixed(1)+'%':'—'}</td>
                </tr>
              );
            })}
            {byPeriod.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
            )}
          </tbody>
          {byPeriod.length > 0 && (
            <tfoot>
              <tr style={{ background:'#002624' }}>
                {[
                  'TOTAL', String(filtered.length),
                  formatBRL(totalDPS), formatBRL(totalOF),
                  formatBRL(totalDPS+totalOF), '100%', '100%'
                ].map((v, i) => (
                  <td key={i} className="px-4 py-3 font-bold text-sm" style={{ color:'#C5FFCE' }}>{v}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Por Igreja */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ background:'#002624' }}>
          <h2 className="text-sm font-bold" style={{ color:'#C5FFCE' }}>RESUMO POR IGREJA</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Igreja','Meses','Total DPS','Total OF','Total Geral','% do Total'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byChurch.map((row, i) => {
              const tot = row.dps + row.of;
              const grandTotal = totalDPS + totalOF;
              return (
                <tr key={row.id} className={i%2===0?'':'bg-gray-50'} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-gray-700">{row.nome}</div>
                    <div className="text-xs text-gray-400">{row.id}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{row.count}</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color:'#FE5000' }}>{formatBRL(row.dps)}</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color:'#1F2A44' }}>{formatBRL(row.of)}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800">{formatBRL(tot)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                        <div className="h-1.5 rounded-full" style={{
                          width: grandTotal>0?`${Math.min(100,(tot/grandTotal)*100)}%`:'0%',
                          background:'#002624'
                        }} />
                      </div>
                      <span className="text-gray-500 text-xs">
                        {grandTotal>0?((tot/grandTotal)*100).toFixed(1)+'%':'—'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalhe lançamentos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ background:'#002624' }}>
          <h2 className="text-sm font-bold" style={{ color:'#C5FFCE' }}>
            LANÇAMENTOS DETALHADOS ({filtered.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Período','Igreja','DPS','OF','Total','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} className={i%2===0?'':'bg-gray-50'} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td className="px-4 py-2 text-gray-700">{l.periodo}</td>
                  <td className="px-4 py-2 text-gray-700">{igMap[l.igreja_id]||l.igreja_id}</td>
                  <td className="px-4 py-2" style={{ color:'#FE5000' }}>{l.dps>0?formatBRL(l.dps):'—'}</td>
                  <td className="px-4 py-2" style={{ color:'#1F2A44' }}>{l.of>0?formatBRL(l.of):'—'}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{formatBRL((l.dps||0)+(l.of||0))}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: l.status==='✅ Pago'?'#D4EDDA':l.status==='⏳ Pendente'?'#FFF3CD':'#FADBD8',
                        color:'#002624'
                      }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
