'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLogin = path === '/login';

  if (isLogin) {
    return <>{children}</>;
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
