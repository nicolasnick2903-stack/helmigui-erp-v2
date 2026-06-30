import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC = ['/login', '/recuperar-senha', '/api/auth/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('helmigui_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.redirect(new URL('/login', req.url))

  if (pathname.startsWith('/admin') && payload.perfil !== 'ADMIN' && payload.perfil !== 'ANALISTA') {
    return NextResponse.redirect(new URL('/cliente/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
