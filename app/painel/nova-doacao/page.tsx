'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPerfil } from '@/lib/supabase-auth';
import { HeartHandshake, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE', LARANJA = '#FE5000';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function NovaDoacao() {
  const router = useRouter();
  const hoje = new Date().toISOString().slice(0, 10);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [tipo, setTipo] = useState<'OF' | 'DPS'>('OF');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const v = parseFloat(String(valor).replace(',', '.'));
    if (!v || v <= 0) { setError('Informe um valor válido.'); return; }
    if (!data) { setError('Informe a data da doação.'); return; }
    setSaving(true);
    try {
      const perfil = await getPerfil();
      if (!perfil?.igreja_id) throw new Error('Perfil sem igreja vinculada.');
      const [ano, mm] = data.split('-').map(Number);
      const lanc = {
        mes: MESES[mm - 1], ano,
        periodo: `${String(mm).padStart(2, '0')}/${ano}`,
        periodo_num: ano * 100 + mm,
        igreja_id: perfil.igreja_id,
        dps: tipo === 'DPS' ? v : 0,
        of: tipo === 'OF' ? v : 0,
        status: '⏳ Pendente',
      };
      const { error: e1 } = await supabase.from('lancamentos').insert([lanc]);
      if (e1) throw new Error(e1.message);

      // dispara o recibo por e-mail (fire-and-forget — nunca bloqueia o fluxo do PIX)
      (async () => {
        try {
          const { data: ig } = await supabase.from('igrejas')
            .select('nome, pastor').eq('id', perfil.igreja_id).maybeSingle();
          await supabase.functions.invoke('enviar-recibo-doacao', {
            body: {
              igreja: ig?.nome || perfil.igreja_id,
              pastorNome: ig?.pastor || '',
              pastorEmail: perfil.email,
              tipo, valor: v, data,
            },
          });
        } catch { /* ignora falha de e-mail */ }
      })();

      // vai para a tela do PIX (simulação — nada é feito de fato com o pagamento)
      router.push(`/painel/pix?valor=${v}&tipo=${tipo}`);
    } catch (err: any) {
      setError(err.message || 'Não foi possível registrar a doação.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/painel/doacoes')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: TEAL }}>Nova Doação</h1>
          <p className="text-sm text-gray-500">Registre uma nova contribuição</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-gray-500">Tipo de contribuição</label>
          <div className="grid grid-cols-2 gap-3">
            {([['OF', 'Ohana Fee'], ['DPS', 'Dízimo do Pastor Sênior']] as const).map(([val, lbl]) => (
              <button type="button" key={val} onClick={() => setTipo(val)}
                className="px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all text-left"
                style={{
                  borderColor: tipo === val ? TEAL : '#e5e7eb',
                  background: tipo === val ? TEAL : '#fff',
                  color: tipo === val ? MINT : '#374151',
                }}>
                <div className="text-base font-bold">{val}</div>
                <div className="text-xs opacity-80">{lbl}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-gray-500">Valor (R$)</label>
          <input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200"
            style={{ color: TEAL }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-gray-500">Data da doação</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: LARANJA, opacity: saving ? 0.6 : 1 }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <HeartHandshake size={16} />}
          {saving ? 'Gerando PIX...' : 'Gerar PIX da doação'}
          {!saving && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  );
}
