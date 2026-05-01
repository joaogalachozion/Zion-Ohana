'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, List, Building2, FileText, Users, LogOut, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const nav = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/lancamentos', label: 'Lançamentos', icon: List },
  { href: '/cadastro',    label: 'Igrejas',     icon: Building2 },
  { href: '/relatorios',  label: 'Relatórios',  icon: FileText },
  { href: '/forecast',    label: 'Forecast',    icon: TrendingUp },
  { href: '/usuarios',    label: 'Usuários',    icon: Users },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col"
      style={{ background: '#002624' }}>

      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-2xl font-bold" style={{ color: '#C5FFCE' }}>ZION</div>
        <div className="text-xs mt-0.5" style={{ color: '#C5FFCE', opacity: 0.6 }}>
          Ohana — Rede de Igrejas
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? '#C5FFCE' : 'transparent',
                color: active ? '#002624' : '#C5FFCE',
                opacity: active ? 1 : 0.75,
              }}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
          style={{ color: '#C5FFCE', opacity: 0.6 }}>
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="text-xs" style={{ color: '#C5FFCE', opacity: 0.4 }}>
          Zion Global • Dunamis
        </div>
      </div>
    </aside>
  );
}
