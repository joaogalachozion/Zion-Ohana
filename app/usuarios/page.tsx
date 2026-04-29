'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Mail } from 'lucide-react';

interface Usuario {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<string>('');

  useEffect(() => {
    loadUsuarios();
  }, []);

  async function loadUsuarios() {
    // Pega o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.email || '');

    // Lista usuários da tabela de perfis (criada no Supabase)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at');

    setUsuarios(data || []);
    setLoading(false);
  }

  async function criarUsuario() {
    setError('');
    setSuccess('');
    if (!email || !senha) { setError('Preencha e-mail e senha'); return; }
    if (senha.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }

    setSaving(true);

    // Cria o usuário via Supabase Auth Admin
    // Como não temos service_role no frontend, usamos a API de signup
    // e depois inserimos na tabela de controle
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    // Insere na tabela de controle
    if (data.user) {
      await supabase.from('usuarios').insert([{
        id: data.user.id,
        email: data.user.email,
        created_at: new Date().toISOString(),
      }]);
    }

    setSuccess(`Usuário ${email} criado! Ele receberá um e-mail de confirmação.`);
    setSaving(false);
    setEmail('');
    setSenha('');
    setModal(false);
    loadUsuarios();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-lg font-medium"
      style={{ color: '#002624' }}>Carregando...</div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#002624' }}>Usuários</h1>
          <p className="text-sm text-gray-500">Gerencie quem tem acesso à plataforma</p>
        </div>
        <div className="flex gap-2">
          <button onClick={logout}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Sair da conta
          </button>
          <button onClick={() => { setModal(true); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
            style={{ background: '#FE5000' }}>
            <Plus size={16} /> Novo Usuário
          </button>
        </div>
      </div>

      {/* Conta atual */}
      <div className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: '#002624' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: '#C5FFCE', color: '#002624' }}>
          {currentUser.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-xs opacity-50" style={{ color: '#C5FFCE' }}>Logado como</div>
          <div className="text-sm font-medium" style={{ color: '#C5FFCE' }}>{currentUser}</div>
        </div>
      </div>

      {success && (
        <div className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ background: '#002624' }}>
          <h2 className="text-sm font-bold" style={{ color: '#C5FFCE' }}>
            USUÁRIOS COM ACESSO ({usuarios.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['E-mail', 'Cadastrado em', 'Último acesso'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nenhum usuário cadastrado ainda
                </td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#E8FFF0', color: '#002624' }}>
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{u.email}</span>
                      {u.email === currentUser && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#C5FFCE', color: '#002624' }}>você</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.last_sign_in_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        💡 Para remover o acesso de um usuário, acesse o painel do Supabase → Authentication → Users.
      </div>

      {/* Modal novo usuário */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b"
              style={{ background: '#002624', borderRadius: '16px 16px 0 0' }}>
              <h2 className="font-bold" style={{ color: '#C5FFCE' }}>Novo Usuário</h2>
              <button onClick={() => setModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                O usuário receberá um e-mail para confirmar o cadastro e poderá acessar a plataforma em seguida.
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">E-MAIL</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">SENHA INICIAL</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={criarUsuario} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: '#002624', opacity: saving ? 0.6 : 1 }}>
                  <Check size={16} />
                  {saving ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
