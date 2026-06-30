'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/admin/dashboard',   label: 'Dashboard',    icon: '◻' },
  { href: '/admin/clientes',    label: 'Clientes',     icon: '◻' },
  { href: '/admin/notas',       label: 'Notas Fiscais',icon: '◻' },
  { href: '/admin/lancamentos', label: 'Lançamentos',  icon: '◻' },
  { href: '/admin/mensagens',   label: 'Mensagens',    icon: '◻' },
  { href: '/admin/relatorios',  label: 'Relatórios',   icon: '◻' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]         = useState<{ nome: string; perfil: string } | null>(null)
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/login'); return }
      setUser(d)
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#0d3d2a]">
      {/* Overlay mobile */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-verde-dark border-r border-white/10 z-30 flex flex-col
        transition-transform duration-200
        ${sideOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-ouro rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-verde-dark font-black text-lg">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Helmigui ERP</p>
            <p className="text-white/40 text-xs">Gestão Financeira</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-ouro text-verde-dark'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <NavIcon name={item.label} active={active} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-ouro/20 border border-ouro/30 flex items-center justify-center flex-shrink-0">
              <span className="text-ouro font-bold text-sm">{user?.nome?.[0] ?? '?'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.nome ?? '...'}</p>
              <p className="text-white/40 text-xs">{user?.perfil ?? ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-sm text-white/50 hover:text-red-400 transition-colors px-1"
          >
            Sair do sistema →
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-verde-dark/80 backdrop-blur border-b border-white/10 flex items-center px-4 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSideOpen(!sideOpen)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-white/50 text-sm hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
          <div className="w-8 h-8 rounded-full bg-ouro/20 border border-ouro/30 flex items-center justify-center">
            <span className="text-ouro font-bold text-sm">{user?.nome?.[0] ?? '?'}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#0d3d2a' : 'currentColor'
  const icons: Record<string, React.ReactNode> = {
    'Dashboard':     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    'Clientes':      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    'Notas Fiscais': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    'Lançamentos':   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    'Mensagens':     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    'Relatórios':    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  }
  return <>{icons[name] ?? null}</>
}
