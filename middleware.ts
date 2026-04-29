import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/login';

  // Pega qualquer cookie do Supabase
  const hasCookie = request.cookies.getAll().some(c =>
    c.name.includes('supabase') || c.name.includes('sb-')
  );

  if (!hasCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
