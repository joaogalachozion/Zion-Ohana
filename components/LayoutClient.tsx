'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isLogin = path === '/login';
  const [checking, setChecking] = useState(!isLogin);

  useEffect(() => {
    if (isLogin) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !isLogin) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [isLogin, router]);

  if (isLogin) {
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 ml-64">
        {children}
      </main>
    </div>
  );
}
