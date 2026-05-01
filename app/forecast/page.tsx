'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase, formatBRL } from '@/lib/supabase';
import type { Lancamento, Igreja } from '@/lib/types';
import { gerarSeriePeriodos } from '@/lib/types';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
  BarChart
} from 'recharts';

// ── Regressão linear ──────────────────────────────────────────────────────
function regressaoLinear(points: {x:number,y:number}[]) {
  const n = points.length;
  if (n < 2) return {a:0, b:0, r2:0};
  const sumX  = points.reduce((s,p)=>s+p.x, 0);
  const sumY  = points.reduce((s,p)=>s+p.y, 0);
  const sumXY = points.reduce((s,p)=>s+p.x*p.y, 0);
  const sumX2 = points.reduce((s,p)=>s+p.x*p.x, 0);
  const b = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const a = (sumY - b*sumX) / n;
  const yMean = sumY / n;
  const ssTot = points.reduce((s,p)=>s+(p.y-yMean)**2, 0);
  const ssRes = points.reduce((s,p)=>s+(p.y-(a+b*p.x))**2, 0);
  const r2 = ssTot===0 ? 1 : Math.max(0, 1 - ssRes/ssTot);
  return {a, b, r2};
}

// ── Sazonalidade ──────────────────────────────────────────────────────────
function analiseEsazonal(serie: string[], valores: number[]) {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const groups: Record<number,number[]> = {};
  serie.forEach((p, i) => {
    const mm = parseInt(p.slice(0,2));
    if (!groups[mm]) groups[mm] = [];
    if (valores[i] > 0) groups[mm].push(valores[i]);
  });
  const all = Object.values(groups).flat();
  const mediaGeral = all.length > 0 ? all.reduce((s,v)=>s+v,0)/all.length : 1;
  return Array.from({length:12},(_,i) => {
    const mm = i+1;
    const vals = groups[mm]||[];
    const media = vals.length>0 ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
    const indice = mediaGeral>0 ? media/mediaGeral : 1;
    return { mes: MESES[i], media, count: vals.length, indice };
  });
}

// ── Tooltip customizado ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const isForecast = payload[0]?.payload?.isForecast;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-bold mb-2 flex items-center gap-2" style={{color:'#002624'}}>
        {label}
        {isForecast && (
          <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{background:'#9CA3AF'}}>
            Projetado
          </span>
        )}
      </div>
      {payload.map((p: any, i: number) => (
        p.value != null && p.value !== 0 && (
          <div key={i} className="flex justify-between gap-4">
            <span style={{color:p.color}}>{p.name}</span>
            <span className="font-semibold">{formatBRL(p.value)}</span>
          </div>
        )
      ))}
    </div>
  );
}

export default function Forecast() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchFilter, setChurchFilter] = useState('');
  const [tipo, setTipo] = useState<'total'|'dps'|'of'>('total');
  const [mesesForecast, setMesesForecast] = useState(6);

  useEffect(() => {
    Promise.all([
      supabase.from('lancamentos').select('*').order('periodo_num'),
      supabase.from('igrejas').select('*').order('id'),
    ]).then(([{data:lans},{data:igs}]) => {
      setLancamentos(lans||[]);
      setIgrejas(igs||[]);
      setLoading(false);
    });
  }, []);

  const igrejasFiltro = useMemo(() =>
    igrejas.filter(ig=>['✅ Ativo','⚠️ Revisão'].includes(ig.status)), [igrejas]);

  // Série histórica
  const historico = useMemo(() => {
    const todaSerie = gerarSeriePeriodos('01/2023','03/2026');
    const lans = churchFilter
      ? lancamentos.filter(l=>l.igreja_id===churchFilter && l.status==='✅ Pago')
      : lancamentos.filter(l=>l.status==='✅ Pago');
    const map: Record<string,{dps:number,of:number}> = {};
    lans.forEach(l => {
      if (!map[l.periodo]) map[l.periodo]={dps:0,of:0};
      map[l.periodo].dps += l.dps||0;
      map[l.periodo].of  += l.of||0;
    });
    return todaSerie.map((periodo,i) => {
      const d = map[periodo]||{dps:0,of:0};
      const val = tipo==='dps'?d.dps:tipo==='of'?d.of:d.dps+d.of;
      return { periodo, index:i, value:val };
    });
  }, [lancamentos, churchFilter, tipo]);

  // Regressão
  const regressao = useMemo(() => {
    const points = historico.map((h,i)=>({x:i,y:h.value}));
    return regressaoLinear(points);
  }, [historico]);

  // Sazonalidade
  const sazonal = useMemo(() =>
    analiseEsazonal(historico.map(h=>h.periodo), historico.map(h=>h.value)),
    [historico]);

  // Data atual
  const hoje = useMemo(() => {
    const d = new Date();
    return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }, []);

  // ── Gráfico unificado: executado (cheio) + projetado (apagado) ────────
  const chartData = useMemo(() => {
    const lastIndex = historico.length - 1;
    const lastPeriodo = historico[lastIndex]?.periodo || '03/2026';
    const [mm, yyyy] = lastPeriodo.split('/').map(Number);

    // Futuro
    const futuro = Array.from({length:mesesForecast},(_,i) => {
      const xIndex = lastIndex + i + 1;
      const trendVal = Math.max(0, regressao.a + regressao.b * xIndex);
      const futMes = ((mm + i) % 12) || 12;
      const futAno = yyyy + Math.floor((mm + i - 1) / 12);
      const sazonalIdx = sazonal[futMes-1]?.indice || 1;
      return {
        periodo: `${String(futMes).padStart(2,'0')}/${futAno}`,
        executado: null as number|null,
        projetado: Math.round(trendVal * sazonalIdx),
        isForecast: true,
      };
    });

    const passado = historico.map(h => ({
      periodo: h.periodo,
      executado: h.value,
      projetado: null as number|null,
      isForecast: false,
    }));

    return [...passado, ...futuro];
  }, [historico, regressao, sazonal, mesesForecast]);

  const tendenciaDir = regressao.b > 50 ? '📈 Crescimento' : regressao.b < -50 ? '📉 Queda' : '➡️ Estável';
  const tendenciaCor = regressao.b > 50 ? '#1E7D4A' : regressao.b < -50 ? '#C0392B' : '#C9A84C';

  const sazonalOrdenado = [...sazonal].filter(s=>s.count>0).sort((a,b)=>b.indice-a.indice);
  const melhorMes = sazonalOrdenado[0];
  const piorMes   = sazonalOrdenado[sazonalOrdenado.length-1];

  // Cores por tipo
  const corPrimaria = tipo==='of' ? '#1F2A44' : '#FE5000';
  const corProjetado = tipo==='of' ? '#A8B4C8' : '#FFBFA0';

  const forecast = chartData.filter(d=>d.isForecast);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg font-medium" style={{color:'#002624'}}>Carregando...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{color:'#002624'}}>Forecast & Análise Preditiva</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Regressão linear + sazonalidade — executado vs projetado
        </p>
      </div>

      {/* Metodologia */}
      <div className="bg-white rounded-xl shadow-sm p-5 border-l-4" style={{borderColor:'#C5FFCE'}}>
        <h2 className="font-bold text-sm mb-2" style={{color:'#002624'}}>Como funciona?</h2>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <div className="font-semibold mb-1" style={{color:'#FE5000'}}>📐 Regressão Linear</div>
            Calcula a linha de tendência geral. O coeficiente b indica se as doações crescem ou caem ao longo do tempo.
          </div>
          <div>
            <div className="font-semibold mb-1" style={{color:'#1F2A44'}}>📅 Ajuste Sazonal</div>
            Identifica quais meses do ano historicamente têm mais/menos doação e aplica esse padrão na projeção.
          </div>
          <div>
            <div className="font-semibold mb-1" style={{color:'#002624'}}>🎨 Leitura do gráfico</div>
            Barras <strong>sólidas</strong> = executado real. Barras <strong>apagadas</strong> = projeção. A linha vertical marca hoje.
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{color:'#002624'}}>TIPO</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value as 'total'|'dps'|'of')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="total">Total (DPS + OF)</option>
            <option value="dps">Só DPS</option>
            <option value="of">Só OF</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{color:'#002624'}}>IGREJA</label>
          <select value={churchFilter} onChange={e=>setChurchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <option value="">Toda a rede</option>
            {igrejasFiltro.map(ig=><option key={ig.id} value={ig.id}>{ig.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{color:'#002624'}}>PROJETAR</label>
          <select value={mesesForecast} onChange={e=>setMesesForecast(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">TENDÊNCIA GERAL</div>
          <div className="text-lg font-bold" style={{color:tendenciaCor}}>{tendenciaDir}</div>
          <div className="text-xs text-gray-400 mt-1">
            {regressao.b>0?'+':''}{formatBRL(regressao.b)}/mês
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">PRECISÃO (R²)</div>
          <div className="text-lg font-bold" style={{color:'#002624'}}>
            {(regressao.r2*100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {regressao.r2>0.7?'Modelo confiável':regressao.r2>0.4?'Moderado':'Dados irregulares'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">MÊS MAIS FORTE</div>
          <div className="text-lg font-bold" style={{color:'#1E7D4A'}}>{melhorMes?.mes||'—'}</div>
          <div className="text-xs text-gray-400 mt-1">
            {melhorMes?`${((melhorMes.indice-1)*100).toFixed(0)}% acima da média`:''}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">MÊS MAIS FRACO</div>
          <div className="text-lg font-bold" style={{color:'#C0392B'}}>{piorMes?.mes||'—'}</div>
          <div className="text-xs text-gray-400 mt-1">
            {piorMes?`${((1-piorMes.indice)*100).toFixed(0)}% abaixo da média`:''}
          </div>
        </div>
      </div>

      {/* ── Gráfico principal: executado sólido + projetado apagado ─────── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold" style={{color:'#002624'}}>
            EXECUTADO vs PROJETADO
            {churchFilter && igrejas.find(ig=>ig.id===churchFilter) &&
              ` — ${igrejas.find(ig=>ig.id===churchFilter)?.nome}`}
          </h2>
        </div>

        {/* Legenda manual */}
        <div className="flex gap-5 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-10 h-3 rounded-sm inline-block" style={{background:corPrimaria}}/>
            Executado (real)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-10 h-3 rounded-sm inline-block" style={{background:corProjetado}}/>
            Projetado (estimativa)
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="border-r-2 border-dashed h-4 inline-block" style={{borderColor:'#9CA3AF'}}/>
            Hoje ({hoje})
          </span>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
            <XAxis
              dataKey="periodo"
              tick={{fontSize:9, fill:'#9CA3AF'}}
              interval={chartData.length>24?2:1}
              angle={-35}
              textAnchor="end"
              height={45}
            />
            <YAxis
              tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}
              tick={{fontSize:10, fill:'#6B7280'}}
            />
            <Tooltip content={<CustomTooltip/>}/>

            {/* Linha vertical marcando hoje */}
            <ReferenceLine
              x={hoje}
              stroke="#9CA3AF"
              strokeDasharray="5 3"
              strokeWidth={2}
              label={{ value:'Hoje', position:'top', fontSize:10, fill:'#9CA3AF' }}
            />

            {/* Barras executadas — cor sólida */}
            <Bar dataKey="executado" name="Executado" maxBarSize={20} radius={[3,3,0,0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isForecast ? 'transparent' : corPrimaria}
                />
              ))}
            </Bar>

            {/* Barras projetadas — cor apagada */}
            <Bar dataKey="projetado" name="Projetado" maxBarSize={20} radius={[3,3,0,0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isForecast ? corProjetado : 'transparent'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de previsão */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3" style={{background:'#002624'}}>
          <h2 className="text-sm font-bold" style={{color:'#C5FFCE'}}>
            PREVISÃO — PRÓXIMOS {mesesForecast} MESES
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Período','Tendência Linear','Ajuste Sazonal','Previsão Final'].map(h=>(
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecast.map((f,i)=>{
              const mesNum = parseInt(f.periodo.slice(0,2));
              const saz = sazonal[mesNum-1];
              const varPct = saz ? ((saz.indice-1)*100) : 0;
              return (
                <tr key={f.periodo} className={i%2===0?'bg-white':'bg-gray-50'}
                  style={{borderBottom:'1px solid #f0f0f0'}}>
                  <td className="px-4 py-3 font-semibold text-gray-700">{f.periodo}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatBRL(Math.max(0, regressao.a + regressao.b * (historico.length + i)))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{color:varPct>=0?'#1E7D4A':'#C0392B'}}>
                      {varPct>=0?'+':''}{varPct.toFixed(1)}% ({saz?.mes})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{color:corPrimaria}}>
                    {f.projetado!=null?formatBRL(f.projetado):'—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#002624'}}>
              <td className="px-4 py-3 font-bold text-sm" style={{color:'#C5FFCE'}}>TOTAL PROJETADO</td>
              <td colSpan={2}/>
              <td className="px-4 py-3 font-bold text-sm" style={{color:'#C5FFCE'}}>
                {formatBRL(forecast.reduce((s,f)=>s+(f.projetado||0),0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Calendário sazonal */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold mb-1" style={{color:'#002624'}}>
          PADRÃO SAZONAL — ÍNDICE POR MÊS DO ANO
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Índice acima de 1.0 = mês historicamente acima da média. Abaixo de 1.0 = abaixo da média.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sazonal} margin={{top:0,right:10,left:10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
            <XAxis dataKey="mes" tick={{fontSize:11,fill:'#6B7280'}}/>
            <YAxis domain={[0,2]} tickFormatter={v=>`${v.toFixed(1)}x`} tick={{fontSize:10,fill:'#6B7280'}}/>
            <Tooltip formatter={(v:number)=>`${v.toFixed(2)}x da média`}/>
            <ReferenceLine y={1} stroke="#9CA3AF" strokeDasharray="4 4"
              label={{value:'Média',fontSize:10,fill:'#9CA3AF'}}/>
            <Bar dataKey="indice" name="Índice" radius={[4,4,0,0]} maxBarSize={36}>
              {sazonal.map((s,i)=>(
                <Cell key={i} fill={s.indice>=1.1?'#1E7D4A':s.indice>=0.9?'#C9A84C':'#C0392B'}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#1E7D4A'}}/> Acima da média ({'>'} 1.1x)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#C9A84C'}}/> Na média</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#C0392B'}}/> Abaixo da média</span>
        </div>
      </div>
    </div>
  );
}
