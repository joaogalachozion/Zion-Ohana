'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Igreja } from '@/lib/types';
import { Plus, Pencil, X, Check, ExternalLink } from 'lucide-react';

const STATUS_OPS = ['✅ Ativo','⚠️ Revisão','🔴 Pendente','⏸️ Suspenso','🔒 Encerrado'];
const EMPTY: Omit<Igreja,'created_at'> = {
  id:'', nome:'', cidade:'', estado:'', pais:'Brasil',
  pastor:'', tel_pastor:'', resp_fin:'', tel_fin:'',
  status:'⚠️ Revisão', link_contrato:''
};

const STATUS_STYLE: Record<string,string> = {
  '✅ Ativo':      '#D4EDDA',
  '⚠️ Revisão':   '#FFF3CD',
  '🔴 Pendente':  '#FADBD8',
  '⏸️ Suspenso':  '#F3F4F6',
  '🔒 Encerrado': '#E5E7EB',
};

export default function Cadastro() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null|'add'|'edit'>(null);
  const [form, setForm] = useState<Omit<Igreja,'created_at'>>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await supabase.from('igrejas').select('*').order('id');
    setIgrejas(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm({...EMPTY}); setError(''); setModal('add'); }
  function openEdit(ig: Igreja) {
    setEditId(ig.id);
    setForm({ id:ig.id, nome:ig.nome, cidade:ig.cidade, estado:ig.estado, pais:ig.pais,
              pastor:ig.pastor, tel_pastor:ig.tel_pastor, resp_fin:ig.resp_fin,
              tel_fin:ig.tel_fin, status:ig.status, link_contrato:ig.link_contrato });
    setError('');
    setModal('edit');
  }

  async function save() {
    setError('');
    if (!form.id || !form.nome) { setError('ID e Nome são obrigatórios'); return; }
    setSaving(true);
    if (modal === 'add') {
      const { error: e } = await supabase.from('igrejas').insert([form]);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      await supabase.from('igrejas').update(form).eq('id', editId);
    }
    setSaving(false);
    setModal(null);
    load();
  }

  function f(k: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-lg font-medium" style={{ color:'#002624' }}>Carregando...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:'#002624' }}>Igrejas</h1>
          <p className="text-sm text-gray-500">{igrejas.length} cadastradas</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
          style={{ background:'#FE5000' }}>
          <Plus size={16} /> Nova Igreja
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {igrejas.map(ig => (
          <div key={ig.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background:'#002624' }}>
              <div>
                <div className="font-bold text-sm" style={{ color:'#C5FFCE' }}>{ig.nome}</div>
                <div className="text-xs opacity-50" style={{ color:'#C5FFCE' }}>{ig.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: STATUS_STYLE[ig.status] || '#F3F4F6', color:'#002624' }}>
                  {ig.status}
                </span>
                <button onClick={() => openEdit(ig)}
                  className="p-1 rounded text-white/40 hover:text-white">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
            <div className="px-4 py-3 space-y-1.5 text-sm text-gray-600">
              {ig.pastor && (
                <div className="flex gap-2">
                  <span className="text-gray-400 text-xs">Pastor</span>
                  <span className="font-medium">{ig.pastor}</span>
                </div>
              )}
              {(ig.cidade || ig.estado) && (
                <div className="flex gap-2">
                  <span className="text-gray-400 text-xs">Local</span>
                  <span>{[ig.cidade, ig.estado, ig.pais].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {ig.tel_pastor && (
                <div className="flex gap-2">
                  <span className="text-gray-400 text-xs">Tel.</span>
                  <span>{ig.tel_pastor}</span>
                </div>
              )}
              {ig.link_contrato && (
                <a href={ig.link_contrato} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs mt-2"
                  style={{ color:'#1F2A44' }}>
                  <ExternalLink size={12} /> Ver Contrato
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0"
              style={{ background:'#002624', borderRadius:'16px 16px 0 0' }}>
              <h2 className="font-bold" style={{ color:'#C5FFCE' }}>
                {modal==='add' ? 'Nova Igreja' : `Editar — ${form.nome}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">ID *</label>
                  <input value={form.id} onChange={f('id')} disabled={modal==='edit'}
                    placeholder="IC-013"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">STATUS</label>
                  <select value={form.status} onChange={f('status')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {STATUS_OPS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">NOME DA IGREJA *</label>
                <input value={form.nome} onChange={f('nome')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">CIDADE</label>
                  <input value={form.cidade} onChange={f('cidade')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">ESTADO</label>
                  <input value={form.estado} onChange={f('estado')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">PAÍS</label>
                <input value={form.pais} onChange={f('pais')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">NOME DO PASTOR</label>
                  <input value={form.pastor} onChange={f('pastor')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">TEL. PASTOR</label>
                  <input value={form.tel_pastor} onChange={f('tel_pastor')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">RESP. FINANCEIRO</label>
                  <input value={form.resp_fin} onChange={f('resp_fin')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">TEL. FINANCEIRO</label>
                  <input value={form.tel_fin} onChange={f('tel_fin')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">🔗 LINK DO CONTRATO</label>
                <input value={form.link_contrato} onChange={f('link_contrato')}
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
