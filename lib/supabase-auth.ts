import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export type Perfil = {
  id: string;
  email: string;
  tipo: 'admin' | 'pastor';
  igreja_id: string | null;
};

// Lê o papel do usuário logado a partir da tabela `usuarios`.
// Se não houver linha (admins antigos), assume 'admin' para não travar o acesso.
export async function getPerfil(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('tipo, igreja_id')
    .eq('id', user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email || '',
    tipo: (data?.tipo as 'admin' | 'pastor') || 'admin',
    igreja_id: data?.igreja_id ?? null,
  };
}
