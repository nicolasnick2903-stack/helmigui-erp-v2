import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { notificarWhatsApp } from '@/lib/whatsapp'
import { z } from 'zod'

const schema = z.object({
  numero:      z.string().optional(),
  emitente:    z.string().optional(),
  valor:       z.number().min(0),
  dataEmissao: z.string().optional(),
  vencimento:  z.string().optional(),
  fluxo:       z.enum(['ENTRADA', 'SAIDA']).default('SAIDA'),
  status:      z.enum(['PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA']).default('PENDENTE'),
  categoria:   z.string().optional(),
  observacoes: z.string().optional(),
  textoOCR:    z.string().optional(),
})

async function getClienteId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('Cliente')
    .select('id')
    .eq('usuarioId', userId)
    .single()
  return data?.id ?? null
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clienteId = await getClienteId(session.id)
  if (!clienteId) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('Nota')
    .select('*')
    .eq('clienteId', clienteId)
    .order('criadoEm', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clienteId = await getClienteId(session.id)
  if (!clienteId) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  try {
    const body   = await req.json()
    const parsed = schema.parse(body)

    const id = 'nota_' + Math.random().toString(36).slice(2, 18)
    const { data, error } = await supabase
      .from('Nota')
      .insert({
        id,
        clienteId,
        ...parsed,
        criadoEm:     new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Busca nome do cliente para a notificação
    const { data: cliente } = await supabase
      .from('Cliente')
      .select('razaoSocial')
      .eq('id', clienteId)
      .single()

    const valor = parsed.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const venc  = parsed.vencimento
      ? new Date(parsed.vencimento).toLocaleDateString('pt-BR')
      : 'não informado'
    const tipo  = parsed.fluxo === 'ENTRADA' ? 'Receita' : 'Despesa'

    await notificarWhatsApp(
      `🧾 *Nova Nota Fiscal lançada!*\n` +
      `👤 Cliente: ${cliente?.razaoSocial ?? 'Desconhecido'}\n` +
      `💰 Valor: ${valor}\n` +
      `📂 Categoria: ${parsed.categoria ?? 'Não informada'}\n` +
      `📊 Tipo: ${tipo}\n` +
      `📅 Vencimento: ${venc}`
    )

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
