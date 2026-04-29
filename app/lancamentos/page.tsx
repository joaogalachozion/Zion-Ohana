'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase, periodoNum, formatBRL } from '@/lib/supabase';
import type { Lancamento, Igreja } from '@/lib/types';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_OPS = ['✅ Pago','⏳ Pendente','🔴 Em Atraso','🔍 Em Validação','↩️ Estornado'];
const PERIODS = Array.from({ length: 48 }, (_, i) => {
  const d = new Date(2023, i, 1);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
});

const EMPTY: Omit<Lancamento,'id'> = {
  mes:'Jan', ano:2026, periodo:'01/2026', periodo_num:202601,
  igreja_id:'', dps:0, of:0, status:'✅ Pago'
};

export default function Lancamentos() {
  const [rows, setRows] = useState<Lancamento[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null);
  const [form, setForm] = useState<Omit<Lancamento,'id'>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterIgreja, setFilterIgreja] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    const [{ data: lans }, { data: igs }] = await Promise.all([
      supabase.from('lancamentos').select('*').order('periodo_num,igreja_id'),
      supabase.from('igrejas').select('*').order('id'),
    ]);
    setRows(lans || []);
    setIgrejas(igs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const igMap = useMemo(() => {
    const m: Record<string,string> = {};
    igrejas.forEach(ig => { m[ig.id] = ig.nome; });
    return m;
  }, [igrejas]);

  const filtered = useMemo(() => rows.filter(r =>
    (!filterPeriodo || r.periodo === filterPeriodo) &&
    (!filterIgreja  || r.igreja_id === filterIgreja) &&
    (!filterStatus  || r.status === filterStatus)
  ), [rows, filterPeriodo, filterIgreja, filterStatus]);

  function openAdd() {
    setForm({...EMPTY});
    setModal('add');
  }

  function openEdit(row: Lancamento) {
    setEditId(row.id!);
    setForm({ mes:row.mes, ano:row.ano, periodo:row.periodo, periodo_num:row.periodo_num,
              igreja_id:row.igreja_id, dps:row.dps, of:row.of, status:row.status });
    setModal('edit');
  }

  function handlePeriodo(p: string) {
    const [mm, yyyy] = p.split('/');
    const mes = MESES[parseInt(mm)-1];
    const ano = parseInt(yyyy);
    const num = parseInt(yyyy)*100 + parseInt(mm);
    setForm(f => ({ ...f, periodo:p, mes, ano, periodo_num:num }));
  }

  async function save() {
    if (!form.igreja_id) { alert('Selecione uma igreja'); return; }
    setSaving(true);
    if (modal === 'add') {
      await supabase.from('lancamentos').insert([form]);
    } else {
      await supabase.from('lancamentos').update(form).eq('id', editId);
    }
    setSaving(false);
    setModal(null);
    load();
  }

  async function del(id: number) {
    if (!confirm('Deletar este lançamento?')) return;
    await supabase.from('lancamentos').delete().eq('id', id);
    load();
  }

  const totalDPS = filtered.reduce((s,r) => s + (r.dps||0), 0);
  const totalOF  = filtered.reduce((s,r) => s + (r.of||0), 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-lg font-medium" style={{ color:'#002624' }}>Carregando...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:'#002624' }}>Lançamentos</h1>
          <p className="text-sm text-gray-500">DPS & OF (Ohana Fee)</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background:'#FE5000' }}>
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">PERÍODO</label>
          <select value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {Array.from(new Set(rows.map(r=>r.periodo))).sort().map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
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
            {STATUS_OPS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {(filterPeriodo || filterIgreja || filterStatus) && (
          <button onClick={() => { setFilterPeriodo(''); setFilterIgreja(''); setFilterStatus(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 self-end pb-2">
            Limpar filtros
          </button>
        )}
        <div className="ml-auto text-sm text-gray-400 self-center">
          {filtered.length} registros
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Total Geral', value:totalDPS+totalOF, bg:'#002624', fg:'#C5FFCE' },
          { label:'Total DPS',   value:totalDPS,         bg:'#FE5000', fg:'#FFFFFF' },
          { label:'Total OF',    value:totalOF,          bg:'#1F2A44', fg:'#C5FFCE' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4" style={{ background:k.bg }}>
            <div className="text-xs opacity-60 mb-1" style={{ color:k.fg }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color:k.fg }}>{formatBRL(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background:'#1F2A44' }}>
                {['Período','Igreja','Valor DPS','Valor OF','Total','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color:'#C5FFCE' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id} className={i%2===0?'bg-white':'bg-gray-50'}
                  style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td className="px-4 py-3 font-medium text-gray-700">{row.periodo}</td>
                  <td className="px-4 py-3 text-gray-700">{igMap[row.igreja_id] || row.igreja_id}</td>
                  <td className="px-4 py-3 font-medium" style={{ color:'#FE5000' }}>
                    {row.dps > 0 ? formatBRL(row.dps) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color:'#1F2A44' }}>
                    {row.of > 0 ? formatBRL(row.of) : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {formatBRL((row.dps||0)+(row.of||0))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: row.status==='✅ Pago' ? '#D4EDDA' :
                                    row.status==='⏳ Pendente' ? '#FFF3CD' :
                                    row.status==='🔴 Em Atraso' ? '#FADBD8' : '#F3F4F6',
                        color: '#002624'
                      }}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(row)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => del(row.id!)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhum lançamento encontrado
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b" style={{ background:'#002624', borderRadius:'16px 16px 0 0' }}>
              <h2 className="font-bold text-base" style={{ color:'#C5FFCE' }}>
                {modal==='add' ? 'Novo Lançamento' : 'Editar Lançamento'}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">PERÍODO</label>
                <select value={form.periodo} onChange={e => handlePeriodo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">IGREJA</label>
                <select value={form.igreja_id} onChange={e => setForm(f => ({...f, igreja_id:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {igrejas.map(ig => <option key={ig.id} value={ig.id}>{ig.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color:'#FE5000' }}>VALOR DPS</label>
                  <input type="number" step="0.01" min="0" value={form.dps}
                    onChange={e => setForm(f => ({...f, dps:parseFloat(e.target.value)||0}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color:'#1F2A44' }}>VALOR OF</label>
                  <input type="number" step="0.01" min="0" value={form.of}
                    onChange={e => setForm(f => ({...f, of:parseFloat(e.target.value)||0}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">STATUS</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {STATUS_OPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background:'#002624', opacity:saving?0.6:1 }}>
                  <Check size={16} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
