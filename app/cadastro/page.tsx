'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Loader2, Building2 } from 'lucide-react';

const MINT = '#C5FFCE', TEAL = '#002624', HEADER = '#00312B', LARANJA = '#FE5000';

type Form = {
  nomePastor: string; dataNascimento: string; telefone: string;
  emailCorporativo: string; telefoneSecretaria: string;
  nomeIgreja: string; cidade: string; estado: string; pais: string;
  senha: string; confirmaSenha: string;
};
const EMPTY: Form = {
  nomePastor: '', dataNascimento: '', telefone: '',
  emailCorporativo: '', telefoneSecretaria: '',
  nomeIgreja: '', cidade: '', estado: '', pais: 'Brasil',
  senha: '', confirmaSenha: '',
};

async function nextIgrejaId(): Promise<string> {
  const { data } = await supabase.from('igrejas').select('id').like('id', 'IC-%');
  let max = 0;
  (data || []).forEach((r: { id: string }) => {
    const n = parseInt(r.id.replace('IC-', ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'IC-' + String(max + 1).padStart(3, '0');
}

export default function CadastroPublico() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const f = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.nomePastor || !form.emailCorporativo || !form.nomeIgreja) {
      setError('Preencha nome do pastor, e-mail corporativo e nome da igreja.'); return;
    }
    if (form.senha.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (form.senha !== form.confirmaSenha) { setError('As senhas não conferem.'); return; }

    setSaving(true);
    try {
      // 1) cria o login
      const { data: signUp, error: e1 } = await supabase.auth.signUp({
        email: form.emailCorporativo.trim(),
        password: form.senha,
      });
      if (e1) throw new Error(e1.message);
      const uid = signUp.user?.id;
      if (!uid) throw new Error('Não foi possível criar o acesso. Tente novamente.');

      // 2) cria a igreja
      const igrejaId = await nextIgrejaId();
      const { error: e2 } = await supabase.from('igrejas').insert([{
        id: igrejaId, nome: form.nomeIgreja, cidade: form.cidade, estado: form.estado,
        pais: form.pais, pastor: form.nomePastor, tel_pastor: form.telefone,
        status: '⚠️ Revisão', link_contrato: '',
        data_nascimento_pastor: form.dataNascimento || null,
        origem_cadastro: 'auto-cadastro',
      }]);
      if (e2) throw new Error(e2.message);

      // 3) perfil do pastor
      await supabase.from('pastores').insert([{
        usuario_id: uid, igreja_id: igrejaId, nome: form.nomePastor,
        data_nascimento: form.dataNascimento || null, telefone: form.telefone,
        email_corporativo: form.emailCorporativo, telefone_secretaria: form.telefoneSecretaria,
      }]);

      // 4) usuário com papel de pastor
      await supabase.from('usuarios').upsert([{
        id: uid, email: form.emailCorporativo, tipo: 'pastor', igreja_id: igrejaId,
      }]);

      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao concluir o cadastro.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: TEAL }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: MINT }}>
            <Check size={32} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: TEAL }}>Cadastro recebido! 🎉</h1>
          <p className="text-sm text-gray-500 mb-6">
            Bem-vindo à família Ohana. Seu acesso foi criado e os dados da sua igreja entraram em revisão.
            Em breve você poderá entrar com seu e-mail e senha.
          </p>
          <a href="/login"
            className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: TEAL }}>
            Ir para o login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: TEAL }}>
      <div className="w-full max-w-lg mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-7">
          <div className="text-3xl font-bold" style={{ color: MINT }}>ZION</div>
          <div className="text-xs opacity-60 mb-4" style={{ color: MINT }}>Ohana — Rede de Igrejas</div>
          <h1 className="text-2xl font-bold text-white">Cadastro da Igreja</h1>
          <p className="text-sm mt-1" style={{ color: '#9fc4bb' }}>
            Preencha seus dados para entrar na rede Ohana
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <Section title="👤 Pastor Sênior">
            <Field label="Nome completo *">
              <input value={form.nomePastor} onChange={f('nomePastor')} className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de nascimento">
                <input type="date" value={form.dataNascimento} onChange={f('dataNascimento')} className={inp} />
              </Field>
              <Field label="Telefone">
                <input value={form.telefone} onChange={f('telefone')} placeholder="(00) 00000-0000" className={inp} />
              </Field>
            </div>
            <Field label="Telefone da secretária">
              <input value={form.telefoneSecretaria} onChange={f('telefoneSecretaria')} placeholder="(00) 00000-0000" className={inp} />
            </Field>
          </Section>

          <Section title="⛪ Igreja">
            <Field label="Nome da igreja *">
              <input value={form.nomeIgreja} onChange={f('nomeIgreja')} className={inp} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Cidade"><input value={form.cidade} onChange={f('cidade')} className={inp} /></Field>
              <Field label="Estado"><input value={form.estado} onChange={f('estado')} className={inp} /></Field>
              <Field label="País"><input value={form.pais} onChange={f('pais')} className={inp} /></Field>
            </div>
          </Section>

          <Section title="🔐 Acesso">
            <Field label="E-mail corporativo *">
              <input type="email" value={form.emailCorporativo} onChange={f('emailCorporativo')}
                placeholder="pastor@suaigreja.com" className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Senha *">
                <input type="password" value={form.senha} onChange={f('senha')} className={inp} />
              </Field>
              <Field label="Confirmar senha *">
                <input type="password" value={form.confirmaSenha} onChange={f('confirmaSenha')} className={inp} />
              </Field>
            </div>
          </Section>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: LARANJA, opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
            {saving ? 'Enviando...' : 'Concluir cadastro'}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: '#6f938b' }}>
          Zion Global • Dunamis Movement
        </p>
      </div>
    </div>
  );
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-gray-100" style={{ color: TEAL }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-gray-500">{label}</label>
      {children}
    </div>
  );
}
