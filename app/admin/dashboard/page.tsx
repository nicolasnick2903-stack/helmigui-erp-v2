'use client'

import { useEffect, useState } from 'react'

type Stats = {
  saldo: number; recMes: number; despMes: number; lucro: number
  aReceber: number; aPagar: number; inadimplentes: number
  totalClientes: number; clientesAtivos: number
  fluxo: { mes: string; receita: number; despesa: number }[]
  alertas: string[]
}

const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-ouro border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const maxFluxo = Math.max(...(stats?.fluxo ?? []).flatMap(m => [m.receita, m.despesa]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Executivo</h1>
        <p className="text-white/50 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alertas */}
      {(stats?.alertas?.length ?? 0) > 0 && (
        <div className="bg-amber-500/15 border border-amber-400/30 rounded-2xl p-4 space-y-1">
          <p className="text-amber-300 font-semibold text-sm mb-2">Alertas Importantes</p>
          {stats!.alertas.map((a, i) => (
            <p key={i} className="text-amber-200 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
              {a}
            </p>
          ))}
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Disponível"  value={R(stats?.saldo ?? 0)}      sub="saldo atual"      color="ouro"  />
        <StatCard title="Receitas do Mês"   value={R(stats?.recMes ?? 0)}     sub="entradas"         color="green" />
        <StatCard title="Despesas do Mês"   value={R(stats?.despMes ?? 0)}    sub="saídas"           color="red"   />
        <StatCard title="Lucro Líquido"     value={R(stats?.lucro ?? 0)}      sub="receitas - desp." color={(stats?.lucro ?? 0) >= 0 ? 'green' : 'red'} />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Receber</p>
          <p className="text-2xl font-bold text-white">{R(stats?.aReceber ?? 0)}</p>
          <p className="text-white/40 text-xs mt-1">notas pendentes de entrada</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Pagar</p>
          <p className="text-2xl font-bold text-white">{R(stats?.aPagar ?? 0)}</p>
          <p className="text-white/40 text-xs mt-1">notas pendentes de saída</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Inadimplência</p>
          <p className="text-2xl font-bold text-red-400">{stats?.inadimplentes ?? 0}</p>
          <p className="text-white/40 text-xs mt-1">notas em atraso</p>
        </div>
      </div>

      {/* Gráfico de fluxo */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white font-semibold mb-5">Fluxo de Caixa — Últimos 6 Meses</p>
        <div className="flex items-end gap-3 h-40">
          {stats?.fluxo.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end h-32">
                <div
                  className="flex-1 bg-ouro/70 rounded-t transition-all"
                  style={{ height: `${(m.receita / maxFluxo) * 100}%`, minHeight: m.receita > 0 ? 4 : 0 }}
                  title={`Receita: ${R(m.receita)}`}
                />
                <div
                  className="flex-1 bg-red-400/60 rounded-t transition-all"
                  style={{ height: `${(m.despesa / maxFluxo) * 100}%`, minHeight: m.despesa > 0 ? 4 : 0 }}
                  title={`Despesa: ${R(m.despesa)}`}
                />
              </div>
              <p className="text-white/40 text-xs capitalize">{m.mes}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="flex items-center gap-1.5 text-xs text-white/50">
            <span className="w-3 h-3 bg-ouro/70 rounded-sm" /> Receita
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/50">
            <span className="w-3 h-3 bg-red-400/60 rounded-sm" /> Despesa
          </span>
        </div>
      </div>

      {/* Clientes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Total Clientes</p>
          <p className="text-3xl font-bold text-white">{stats?.totalClientes ?? 0}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Clientes Ativos</p>
          <p className="text-3xl font-bold text-ouro">{stats?.clientesAtivos ?? 0}</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    ouro:  'text-ouro',
    green: 'text-emerald-400',
    red:   'text-red-400',
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-xl font-bold ${colors[color] ?? 'text-white'}`}>{value}</p>
      <p className="text-white/30 text-xs mt-1">{sub}</p>
    </div>
  )
}
