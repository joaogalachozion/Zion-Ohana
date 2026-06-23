'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';
import { getPerfil } from '@/lib/supabase-auth';

// Rotas públicas (sem login e sem sidebar)
const PUBLIC = ['/login', '/cadastro'];
const isPublic = (p: string) => PUBLIC.some(r => p === r || p.startsWith(r + '/'));

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const pub = isPublic(path);
  const [checking, setChecking] = useState(!pub);
  const [tipo, setTipo] = useState<'admin' | 'pastor'>('admin');
  const [bare, setBare] = useState(false); // tela cheia (sem sidebar) p/ troca de senha

  useEffect(() => {
    if (pub) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      const perfil = await getPerfil();
      const role = perfil?.tipo || 'admin';
      setTipo(role);

      // 1) Senha provisória: força troca antes de qualquer outra coisa
      if (perfil?.senha_provisoria) {
        if (path !== '/trocar-senha') { router.replace('/trocar-senha'); return; }
        setBare(true); setChecking(false); return;
      }
      if (path === '/trocar-senha') {
        router.replace(role === 'pastor' ? '/painel' : '/');
        return;
      }

      // 2) Gating por papel
      if (role === 'pastor' && !path.startsWith('/painel')) {
        router.replace('/painel');
        return;
      }
      if (role === 'admin' && path.startsWith('/painel')) {
        router.replace('/');
        return;
      }
      setBare(false);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !pub) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [pub, path, router]);

  if (pub) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#002624' }}>
        <div className="text-sm font-medium" style={{ color: '#C5FFCE' }}>
          Verificando acesso...
        </div>
      </div>
    );
  }

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar tipo={tipo} />
      <main className="flex-1 overflow-auto p-6 ml-64">
        {children}
      </main>
    </div>
  );
}
