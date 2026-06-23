'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPerfil } from '@/lib/supabase-auth';
import { Loader2, KeyRound, Check } from 'lucide-react';

const TEAL = '#002624', MINT = '#C5FFCE', LARANJA = '#FE5000';

export default function TrocarSenha() {
  const router = useRouter();
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (nova.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (nova !== conf) { setError('As senhas não conferem.'); return; }
    setSaving(true);
    try {
      const { error: e1 } = await supabase.auth.updateUser({ password: nova });
      if (e1) throw new Error(e1.message);
      const perfil = await getPerfil();
      if (perfil) {
        await supabase.from('usuarios').update({ senha_provisoria: false }).eq('id', perfil.id);
      }
      // redireciona conforme o papel
      window.location.href = perfil?.tipo === 'pastor' ? '/painel' : '/';
    } catch (err: any) {
      setError(err.message || 'Não foi possível alterar a senha.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: TEAL }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-3xl font-bold" style={{ color: MINT }}>ZION</div>
          <div className="text-xs opacity-60" style={{ color: MINT }}>Ohana — Rede de Igrejas</div>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: MINT }}>
            <KeyRound size={22} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: TEAL }}>Crie sua senha</h1>
          <p className="text-sm text-gray-500 mb-6">
            Este é seu primeiro acesso. Defina uma senha pessoal para continuar.
          </p>
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500">Nova senha</label>
              <input type="password" value={nova} onChange={e => setNova(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500">Confirmar nova senha</label>
              <input type="password" value={conf} onChange={e => setConf(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: LARANJA, opacity: saving ? 0.6 : 1 }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Salvando...' : 'Salvar e entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
