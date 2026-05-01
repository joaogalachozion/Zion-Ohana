'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Igreja, Lancamento } from '@/lib/types';
import { calcularFidelidade, aniversariantesDoMes, formatarEndereco } from '@/lib/types';
import { Plus, Pencil, X, Check, ExternalLink, Gift, Cake } from 'lucide-react';

const STATUS_OPS = ['✅ Ativo','⚠️ Revisão','🔴 Pendente','⏸️ Suspenso','🔒 Encerrado'];

const EMPTY: Omit<Igreja,'created_at'> = {
  id:'', nome:'', cidade:'', estado:'', pais:'Brasil',
  pastor:'', tel_pastor:'', resp_fin:'', tel_fin:'',
  status:'⚠️ Revisão', link_contrato:'',
  data_nascimento_pastor:'', data_entrada_ohana:'',
  endereco:'', complemento:'', bairro:'',
  cidade_endereco:'', estado_endereco:'', cep:'', pais_endereco:'Brasil',
};

const STATUS_STYLE: Record<string,string> = {
  '✅ Ativo':      '#D4EDDA',
  '⚠️ Revisão':   '#FFF3CD',
  '🔴 Pendente':  '#FADBD8',
  '⏸️ Suspenso':  '#F3F4F6',
  '🔒 Encerrado': '#E5E7EB',
};

function StarsDisplay({ estrelas, isNovo, pct }: { estrelas: number; isNovo: boolean; pct: number }) {
  if (isNovo) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: '#E8FFF0', color: '#002624' }}>🆕 Novo</span>
  );
  if (estrelas === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3].map(s => (
        <span key={s} style={{ opacity: s <= estrelas ? 1 : 0.2, fontSize: '14px' }}>⭐</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{pct}%</span>
    </div>
  );
}

export default function Cadastro() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null|'add'|'edit'>(null);
  const [form, setForm] = useState<Omit<Igreja,'created_at'>>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'cards'|'aniversarios'>('cards');
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth()+1);

  async function load() {
    const [{ data: igs }, { data: lans }] = await Promise.all([
      supabase.from('igrejas').select('*').order('id'),
      supabase.from('lancamentos').select('*'),
    ]);
    setIgrejas(igs || []);
    setLancamentos(lans || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm({...EMPTY}); setError(''); setModal('add'); }
  function openEdit(ig: Igreja) {
    setEditId(ig.id);
    setForm({
      id:ig.id, nome:ig.nome, cidade:ig.cidade||'', estado:ig.estado||'', pais:ig.pais||'Brasil',
      pastor:ig.pastor||'', tel_pastor:ig.tel_pastor||'', resp_fin:ig.resp_fin||'', tel_fin:ig.tel_fin||'',
      status:ig.status||'⚠️ Revisão', link_contrato:ig.link_contrato||'',
      data_nascimento_pastor:ig.data_nascimento_pastor||'',
      data_entrada_ohana:ig.data_entrada_ohana||'',
      endereco:ig.endereco||'', complemento:ig.complemento||'', bairro:ig.bairro||'',
      cidade_endereco:ig.cidade_endereco||'', estado_endereco:ig.estado_endereco||'',
      cep:ig.cep||'', pais_endereco:ig.pais_endereco||'Brasil',
    });
    setError(''); setModal('edit');
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
    setSaving(false); setModal(null); load();
  }

  function f(k: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));
  }

  const aniversariantes = useMemo(() =>
    aniversariantesDoMes(igrejas, mesFiltro), [igrejas, mesFiltro]);

  const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-lg font-medium" style={{color:'#002624'}}>
      Carregando...
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'#002624'}}>Igrejas</h1>
          <p className="text-sm text-gray-500">{igrejas.filter(ig=>ig.status==='✅ Ativo').length} ativas · {igrejas.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab(tab==='cards'?'aniversarios':'cards')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            style={{color:'#002624'}}>
            <Cake size={16}/>
            {tab==='cards'?'Ver Aniversários':'Ver Igrejas'}
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
            style={{background:'#FE5000'}}>
            <Plus size={16}/> Nova Igreja
          </button>
        </div>
      </div>

      {/* Aba Aniversários */}
      {tab === 'aniversarios' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <Cake size={18} style={{color:'#FE5000'}}/>
            <span className="text-sm font-semibold" style={{color:'#002624'}}>Aniversariantes do mês:</span>
            <div className="flex gap-1 flex-wrap">
              {MESES_NOMES.map((m,i) => (
                <button key={m} onClick={() => setMesFiltro(i+1)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: mesFiltro===i+1 ? '#002624' : '#F3F4F6',
                    color: mesFiltro===i+1 ? '#C5FFCE' : '#374151',
                  }}>{m}</button>
              ))}
            </div>
          </div>

          {aniversariantes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
              Nenhum aniversariante em {MESES_NOMES[mesFiltro-1]}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {aniversariantes.map(ig => {
                const dt = ig.data_nascimento_pastor ? new Date(ig.data_nascimento_pastor) : null;
                const dia = dt ? dt.getDate() : null;
                const end = formatarEndereco(ig);
                return (
                  <div key={ig.id} className="bg-white rounded-xl shadow-sm overflow-hidden border-2"
                    style={{borderColor:'#FE5000'}}>
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{background:'#FE5000'}}>
                      <div className="font-bold text-sm text-white">{ig.nome}</div>
                      <div className="text-white font-bold text-lg">{dia ? `Dia ${dia}` : '—'}</div>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-sm text-gray-600">
                      <div className="flex gap-2">
                        <span className="text-gray-400 text-xs w-16">Pastor</span>
                        <span className="font-medium">{ig.pastor||'—'}</span>
                      </div>
                      {ig.tel_pastor && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 text-xs w-16">Tel.</span>
                          <span>{ig.tel_pastor}</span>
                        </div>
                      )}
                      {end && (
                        <div className="flex gap-2 mt-2">
                          <Gift size={12} className="text-gray-400 mt-0.5 flex-shrink-0"/>
                          <span className="text-xs text-gray-500">{end}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cards das igrejas */}
      {tab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {igrejas.map(ig => {
            const { tag, estrelas, pct, isNovo, mesesComDoacao, mesesAtivos } =
              calcularFidelidade(ig.data_entrada_ohana, [], lancamentos, ig.id);
            const end = formatarEndereco(ig);
            return (
              <div key={ig.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{background:'#002624'}}>
                  <div>
                    <div className="font-bold text-sm" style={{color:'#C5FFCE'}}>{ig.nome}</div>
                    <div className="text-xs opacity-50" style={{color:'#C5FFCE'}}>{ig.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{background:STATUS_STYLE[ig.status]||'#F3F4F6',color:'#002624'}}>
                      {ig.status}
                    </span>
                    <button onClick={() => openEdit(ig)}
                      className="p-1 rounded text-white/40 hover:text-white">
                      <Pencil size={14}/>
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5 text-sm text-gray-600">
                  {ig.pastor && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 text-xs w-20">Pastor</span>
                      <span className="font-medium">{ig.pastor}</span>
                    </div>
                  )}
                  {(ig.cidade||ig.estado) && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 text-xs w-20">Sede</span>
                      <span>{[ig.cidade,ig.estado].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {ig.data_nascimento_pastor && (
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-400 text-xs w-20">Aniversário</span>
                      <span className="flex items-center gap-1">
                        <Cake size={11} style={{color:'#FE5000'}}/>
                        {new Date(ig.data_nascimento_pastor).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}
                      </span>
                    </div>
                  )}
                  {ig.data_entrada_ohana && (
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-400 text-xs w-20">No Ohana</span>
                      <span>desde {new Date(ig.data_entrada_ohana).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span>
                    </div>
                  )}

                  {/* Fidelidade */}
                  <div className="flex gap-2 items-center pt-1">
                    <span className="text-gray-400 text-xs w-20">Fidelidade</span>
                    <StarsDisplay estrelas={estrelas} isNovo={isNovo} pct={pct}/>
                    {!isNovo && estrelas>0 && (
                      <span className="text-xs text-gray-400">({mesesComDoacao}/{mesesAtivos}m)</span>
                    )}
                  </div>

                  {end && (
                    <div className="flex gap-2 mt-1 pt-1 border-t border-gray-100">
                      <Gift size={12} className="text-gray-300 mt-0.5 flex-shrink-0"/>
                      <span className="text-xs text-gray-400 truncate">{end}</span>
                    </div>
                  )}
                  {ig.link_contrato && (
                    <a href={ig.link_contrato} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs mt-1"
                      style={{color:'#1F2A44'}}>
                      <ExternalLink size={11}/> Ver Contrato
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10"
              style={{background:'#002624',borderRadius:'16px 16px 0 0'}}>
              <h2 className="font-bold" style={{color:'#C5FFCE'}}>
                {modal==='add'?'Nova Igreja':`Editar — ${form.nome}`}
              </h2>
              <button onClick={()=>setModal(null)} className="text-white/60 hover:text-white">
                <X size={18}/>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

              {/* Identificação */}
              <Section title="Identificação">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ID *" disabled={modal==='edit'}>
                    <input value={form.id} onChange={f('id')} disabled={modal==='edit'}
                      placeholder="IC-013"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"/>
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={f('status')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {STATUS_OPS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Nome da Igreja *">
                  <input value={form.nome} onChange={f('nome')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Cidade">
                    <input value={form.cidade} onChange={f('cidade')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="Estado">
                    <input value={form.estado} onChange={f('estado')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="País">
                    <input value={form.pais} onChange={f('pais')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                </div>
              </Section>

              {/* Liderança */}
              <Section title="🧑‍🏫 Liderança">
                <Field label="Nome do Pastor">
                  <input value={form.pastor} onChange={f('pastor')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tel. Pastor">
                    <input value={form.tel_pastor} onChange={f('tel_pastor')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="🎂 Data de Nascimento do Pastor">
                    <input type="date" value={form.data_nascimento_pastor||''} onChange={f('data_nascimento_pastor')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Resp. Financeiro">
                    <input value={form.resp_fin} onChange={f('resp_fin')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="Tel. Financeiro">
                    <input value={form.tel_fin} onChange={f('tel_fin')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                </div>
              </Section>

              {/* Ohana */}
              <Section title="🏛 Ohana">
                <Field label="📅 Data de Entrada no Ohana">
                  <input type="date" value={form.data_entrada_ohana||''} onChange={f('data_entrada_ohana')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
                <Field label="🔗 Link do Contrato">
                  <input value={form.link_contrato} onChange={f('link_contrato')}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
              </Section>

              {/* Endereço para presentes */}
              <Section title="🎁 Endereço para Envio de Presentes">
                <Field label="Endereço (Rua, nº)">
                  <input value={form.endereco||''} onChange={f('endereco')}
                    placeholder="Rua das Flores, 123"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Complemento">
                    <input value={form.complemento||''} onChange={f('complemento')}
                      placeholder="Apto 42, Bloco B"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="Bairro">
                    <input value={form.bairro||''} onChange={f('bairro')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Cidade">
                    <input value={form.cidade_endereco||''} onChange={f('cidade_endereco')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="Estado">
                    <input value={form.estado_endereco||''} onChange={f('estado_endereco')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                  <Field label="CEP">
                    <input value={form.cep||''} onChange={f('cep')}
                      placeholder="00000-000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </Field>
                </div>
                <Field label="País">
                  <input value={form.pais_endereco||'Brasil'} onChange={f('pais_endereco')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </Field>
              </Section>

              <div className="flex gap-3 pt-2">
                <button onClick={()=>setModal(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{background:'#002624',opacity:saving?0.6:1}}>
                  <Check size={16}/>
                  {saving?'Salvando...':'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-gray-100"
        style={{color:'#002624'}}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-gray-500">{label}</label>
      {children}
    </div>
  );
}
