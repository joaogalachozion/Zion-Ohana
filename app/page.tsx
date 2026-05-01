'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase, periodoNum, formatBRL } from '@/lib/supabase';
import type { Lancamento, Igreja } from '@/lib/types';
import { gerarSeriePeriodos, calcularFidelidade } from '@/lib/types';
import KPICard from '@/components/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PERIODS = Array.from({ length: 48 }, (_, i) => {
  const d = new Date(2023, i, 1);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
});
const PIE_COLORS = ['#FE5000','#1F2A44','#C5FFCE','#002624','#00312B',
  '#6B7280','#FFF0EB','#D6E4F0','#E8FFF0','#FCF8F5','#374151','#9CA3AF'];
const ANOS = ['Todos','2023','2024','2025','2026'];

export default function Dashboard() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState('01/2023');
  const [ate, setAte] = useState('03/2026');
  const [churchFilter, setChurchFilter] = useState('');
  const [anoFid, setAnoFid] = useState('Todos');
  const [tipoFid, setTipoFid] = useState<'ambos'|'dps'|'of'>('ambos');

  useEffect(() => {
    Promise.all([
      supabase.from('lancamentos').select('*').order('periodo_num'),
      supabase.from('igrejas').select('*').order('id'),
    ]).then(([{ data: lans }, { data: igs }]) => {
      setLancamentos(lans || []);
      setIgrejas(igs || []);
      setLoading(false);
    });
  }, []);

  const igrejaNome = useMemo(() => {
    const m: Record<string,string> = {};
    igrejas.forEach(ig => { m[ig.id] = ig.nome; });
    return m;
  }, [igrejas]);

  const filtered = useMemo(() => {
    const pns = periodoNum(de), pne = periodoNum(ate);
    return lancamentos.filter(l =>
      l.periodo_num >= pns && l.periodo_num <= pne &&
      l.status === '✅ Pago' &&
      (!churchFilter || l.igreja_id === churchFilter)
    );
  }, [lancamentos, de, ate, churchFilter]);

  const totalDPS = filtered.reduce((s,l) => s+(l.dps||0), 0);
  const totalOF  = filtered.reduce((s,l) => s+(l.of||0), 0);

  // Gráfico de barras com série completa — meses sem doação = 0 (não omitidos)
  const monthlyData = useMemo(() => {
    const serie = gerarSeriePeriodos(de, ate);
    const map: Record<string,{DPS:number;OF:number}> = {};
    filtered.forEach(l => {
      if (!map[l.periodo]) map[l.periodo] = {DPS:0,OF:0};
      map[l.periodo].DPS += l.dps||0;
      map[l.periodo].OF  += l.of||0;
    });
    return serie.map(p => ({ periodo: p, DPS: map[p]?.DPS||0, OF: map[p]?.OF||0 }));
  }, [filtered, de, ate]);

  // Pies
  const byChurchOF = useMemo(() => {
    const map: Record<string,number> = {};
    filtered.forEach(l => { map[l.igreja_id]=(map[l.igreja_id]||0)+(l.of||0); });
    return Object.entries(map).filter(([,v])=>v>0)
      .map(([id,value])=>({name:igrejaNome[id]||id,value})).sort((a,b)=>b.value-a.value);
  }, [filtered, igrejaNome]);

  const byChurchDPS = useMemo(() => {
    const map: Record<string,number> = {};
    filtered.forEach(l => { map[l.igreja_id]=(map[l.igreja_id]||0)+(l.dps||0); });
    return Object.entries(map).filter(([,v])=>v>0)
      .map(([id,value])=>({name:igrejaNome[id]||id,value})).sort((a,b)=>b.value-a.value);
  }, [filtered, igrejaNome]);

  const ofVsDps = [{name:'OF',value:totalOF},{name:'DPS',value:totalDPS}].filter(d=>d.value>0);

  // Tabela de fidelidade
  const fidPeriodos = useMemo(() => {
    let s = gerarSeriePeriodos('01/2023','03/2026');
    if (anoFid !== 'Todos') s = s.filter(p=>p.endsWith(anoFid));
    return s;
  }, [anoFid]);

  const fidMap = useMemo(() => {
    const m: Record<string,Record<string,{dps:boolean,of:boolean}>> = {};
    lancamentos.forEach(l => {
      if (!m[l.igreja_id]) m[l.igreja_id] = {};
      if (!m[l.igreja_id][l.periodo]) m[l.igreja_id][l.periodo]={dps:false,of:false};
      if ((l.dps||0)>0) m[l.igreja_id][l.periodo].dps=true;
      if ((l.of||0)>0)  m[l.igreja_id][l.periodo].of=true;
    });
    return m;
  }, [lancamentos]);

  const igrejasAtivas = useMemo(() =>
    igrejas.filter(ig=>['✅ Ativo','⚠️ Revisão'].includes(ig.status)), [igrejas]);

  function cellColor(dps:boolean,of:boolean) {
    if (tipoFid==='dps') return dps?'#FE5000':'#F3F4F6';
    if (tipoFid==='of')  return of?'#1F2A44':'#F3F4F6';
    if (dps&&of) return '#002624';
    if (dps) return '#FE5000';
    if (of)  return '#1F2A44';
    return '#F3F4F6';
  }
  function cellLabel(dps:boolean,of:boolean) {
    if (tipoFid==='dps') return dps?'✓':'';
    if (tipoFid==='of')  return of?'✓':'';
    if (dps&&of) return '✓';
    if (dps) return 'D';
    if (of)  return 'O';
    return '';
  }

  const igrejasFiltro = igrejas.filter(ig=>['✅ Ativo','⚠️ Revisão'].includes(ig.status));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg font-medium" style={{color:'#002624'}}>Carregando...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{color:'#002624'}}>Dashboard Financeiro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rede de Igrejas — DPS & OF (Ohana Fee)</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        {[['DE',de,setDe],['ATÉ',ate,setAte]].map(([lbl,val,fn])=>(
          <div key={lbl as string}>
            <label className="block text-xs font-semibold mb-1" style={{color:'#002624'}}>{lbl as string}</label>
            <select value={val as string} onChange={e=>(fn as (v:string)=>void)(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {PERIODS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold mb-1" style={{color:'#002624'}}>IGREJA</label>
          <select value={churchFilter} onChange={e=>setChurchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <option value="">Todas as igrejas</option>
            {igrejasFiltro.map(ig=><option key={ig.id} value={ig.id}>{ig.nome}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-400 self-center">{filtered.length} lançamentos</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Total Arrecadado" value={totalDPS+totalOF} bg="#002624" fg="#C5FFCE" accent="#FE5000"/>
        <KPICard label="Total DPS"        value={totalDPS}         bg="#FE5000" fg="#FFFFFF"/>
        <KPICard label="Total OF (Ohana)" value={totalOF}          bg="#1F2A44" fg="#C5FFCE"/>
      </div>

      {/* Bar chart com série completa */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold mb-1" style={{color:'#002624'}}>
          RECEITA MENSAL — DPS vs OF{churchFilter&&` — ${igrejaNome[churchFilter]}`}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Meses sem repasse aparecem como barra zero — evidenciando ausências de doação.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{top:0,right:10,left:10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="periodo" tick={{fontSize:9,fill:'#9CA3AF'}}
              interval={monthlyData.length>18?2:0} angle={-35} textAnchor="end" height={45}/>
            <YAxis tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:'#6B7280'}}/>
            <Tooltip formatter={(v:number)=>formatBRL(v)}/>
            <Bar dataKey="DPS" fill="#FE5000" radius={[3,3,0,0]} maxBarSize={22}/>
            <Bar dataKey="OF"  fill="#1F2A44" radius={[3,3,0,0]} maxBarSize={22}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mapa de Fidelidade */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{background:'#002624'}}>
          <h2 className="text-sm font-bold" style={{color:'#C5FFCE'}}>
            MAPA DE FIDELIDADE — PRESENÇA DE DOAÇÕES POR MÊS
          </h2>
          <div className="flex gap-2">
            <select value={anoFid} onChange={e=>setAnoFid(e.target.value)}
              className="text-xs px-2 py-1 rounded border-0 font-medium"
              style={{background:'#00312B',color:'#C5FFCE'}}>
              {ANOS.map(a=><option key={a}>{a}</option>)}
            </select>
            <select value={tipoFid} onChange={e=>setTipoFid(e.target.value as 'ambos'|'dps'|'of')}
              className="text-xs px-2 py-1 rounded border-0 font-medium"
              style={{background:'#00312B',color:'#C5FFCE'}}>
              <option value="ambos">DPS + OF</option>
              <option value="dps">Só DPS</option>
              <option value="of">Só OF</option>
            </select>
          </div>
        </div>
        <div className="px-4 py-2 flex gap-4 text-xs text-gray-500 border-b bg-gray-50 flex-wrap">
          {tipoFid==='ambos'?(<>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#002624'}}/> DPS+OF</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#FE5000'}}/> Só DPS</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#1F2A44'}}/> Só OF</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-gray-200"/> Sem doação</span>
          </>):tipoFid==='dps'?(<>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#FE5000'}}/> Com DPS</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-gray-200"/> Sem DPS</span>
          </>):(<>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#1F2A44'}}/> Com OF</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-gray-200"/> Sem OF</span>
          </>)}
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr style={{background:'#F9FAFB'}}>
                <th className="text-left px-4 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[160px] border-r border-gray-100">
                  Igreja
                </th>
                {fidPeriodos.map(p=>(
                  <th key={p} className="px-0.5 py-2 font-medium text-gray-400 text-center" style={{minWidth:'38px',fontSize:'9px'}}>
                    {p.slice(0,2)}<br/><span className="text-gray-300">{p.slice(5,7)}</span>
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold text-gray-600 text-center min-w-[80px]">Fidelidade</th>
              </tr>
            </thead>
            <tbody>
              {igrejasAtivas.map((ig,i)=>{
                const igData = fidMap[ig.id]||{};
                const { pct, mesesComDoacao, mesesAtivos } = calcularFidelidade(
                  ig.data_entrada_ohana, fidPeriodos, lancamentos, ig.id
                );
                const rowBg = i%2===0?'#FFFFFF':'#F9FAFB';
                return (
                  <tr key={ig.id}>
                    <td className="px-4 py-1.5 font-medium text-gray-700 sticky left-0 z-10 border-r border-gray-100"
                      style={{background:rowBg}}>
                      <div className="truncate max-w-[150px]" title={ig.nome}>{ig.nome}</div>
                    </td>
                    {fidPeriodos.map(periodo=>{
                      const cell = igData[periodo]||{dps:false,of:false};
                      const bg = cellColor(cell.dps, cell.of);
                      const lbl = cellLabel(cell.dps, cell.of);
                      const hasData = cell.dps||cell.of;
                      return (
                        <td key={periodo} className="px-0.5 py-1" title={`${ig.nome} — ${periodo}`}>
                          <div className="w-8 h-6 rounded flex items-center justify-center mx-auto font-bold"
                            style={{background:bg,color:hasData?'#FFFFFF':'#D1D5DB',fontSize:'9px'}}>
                            {lbl}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-14 bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full"
                            style={{width:`${pct}%`,background:pct>=80?'#1E7D4A':pct>=50?'#C9A84C':'#C0392B'}}/>
                        </div>
                        <span className="font-bold text-gray-700" style={{fontSize:'10px'}}>{pct}%</span>
                      </div>
                      <div className="text-center text-gray-400" style={{fontSize:'9px'}}>{mesesComDoacao}/{mesesAtivos}m</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pies */}
      <div className="grid grid-cols-3 gap-4">
        <PieCard title="OF por Igreja"   data={byChurchOF}/>
        <PieCard title="DPS por Igreja"  data={byChurchDPS}/>
        <PieCard title="OF vs DPS"       data={ofVsDps} colors={['#1F2A44','#FE5000']}/>
      </div>
    </div>
  );
}

function PieCard({title,data,colors}:{title:string;data:{name:string;value:number}[];colors?:string[]}) {
  const cols = colors||PIE_COLORS;
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold mb-3" style={{color:'#002624'}}>{title}</h2>
      {data.length===0?(
        <div className="text-center text-gray-400 py-8 text-sm">Sem dados</div>
      ):(
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                {data.map((_,i)=><Cell key={i} fill={cols[i%cols.length]}/>)}
              </Pie>
              <Tooltip formatter={(v:number)=>formatBRL(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {data.map((d,i)=>{
              const total=data.reduce((s,x)=>s+x.value,0);
              const pct=total>0?((d.value/total)*100).toFixed(1):'0';
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:cols[i%cols.length]}}/>
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
