import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const now   = new Date()
  const mesIni = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  const [{ data: lancamentos }, { data: notas }, { data: clientes }] = await Promise.all([
    supabase.from('Lancamento').select('tipo, valor, data'),
    supabase.from('Nota').select('valor, status, vencimento, fluxo'),
    supabase.from('Cliente').select('id, status'),
  ])

  const todos    = lancamentos ?? []
  const doMes    = todos.filter(l => l.data >= mesIni && l.data <= mesFim)

  const saldo    = todos.reduce((s, l) => l.tipo === 'ENTRADA' ? s + l.valor : s - l.valor, 0)
  const recMes   = doMes.filter(l => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0)
  const despMes  = doMes.filter(l => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0)
  const lucro    = recMes - despMes

  const aReceber = (notas ?? [])
    .filter(n => ['PENDENTE', 'EM_ANALISE'].includes(n.status) && n.fluxo === 'entrada')
    .reduce((s, n) => s + n.valor, 0)
  const aPagar   = (notas ?? [])
    .filter(n => ['PENDENTE', 'EM_ANALISE'].includes(n.status) && n.fluxo === 'saida')
    .reduce((s, n) => s + n.valor, 0)

  const hoje = now.toISOString().split('T')[0]
  const inadimplentes = (notas ?? []).filter(n =>
    n.status === 'PENDENTE' && n.vencimento && n.vencimento < hoje && n.fluxo === 'entrada'
  ).length

  // Fluxo dos últimos 6 meses
  const meses: { mes: string; receita: number; despesa: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ini = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    const grupo = todos.filter(l => l.data >= ini && l.data <= fim)
    meses.push({
      mes:     d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receita: grupo.filter(l => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0),
      despesa: grupo.filter(l => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0),
    })
  }

  // Alertas
  const alertas: string[] = []
  const vencendoHoje = (notas ?? []).filter(n => n.vencimento === hoje && n.status === 'PENDENTE')
  if (vencendoHoje.length > 0) alertas.push(`${vencendoHoje.length} nota(s) vencendo hoje`)
  if (inadimplentes > 0) alertas.push(`${inadimplentes} nota(s) em atraso`)
  const clientesInativos = (clientes ?? []).filter(c => c.status === 'SUSPENSO').length
  if (clientesInativos > 0) alertas.push(`${clientesInativos} cliente(s) suspenso(s)`)

  return NextResponse.json({
    saldo, recMes, despMes, lucro, aReceber, aPagar, inadimplentes,
    totalClientes: (clientes ?? []).length,
    clientesAtivos: (clientes ?? []).filter(c => c.status === 'ATIVO').length,
    fluxo: meses,
    alertas,
  })
}
