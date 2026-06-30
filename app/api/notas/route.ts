import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  clienteId:    z.string().min(1),
  numero:       z.string().optional(),
  emitente:     z.string().optional(),
  cnpjEmitente: z.string().optional(),
  valor:        z.number().min(0),
  dataEmissao:  z.string().optional(),
  vencimento:   z.string().optional(),
  tipo:         z.string().optional(),
  categoria:    z.string().optional(),
  fluxo:        z.enum(['ENTRADA', 'SAIDA']).default('ENTRADA'),
  status:       z.enum(['PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA']).default('PENDENTE'),
  observacoes:  z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clienteId = req.nextUrl.searchParams.get('clienteId')

  let query = supabase
    .from('Nota')
    .select('*, cliente:Cliente(razaoSocial, nomeFantasia, cnpj)')
    .order('criadoEm', { ascending: false })

  if (clienteId) query = query.eq('clienteId', clienteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = schema.parse(body)

    const id = 'nota_' + Math.random().toString(36).slice(2, 18)
    const { data, error } = await supabase
      .from('Nota')
      .insert({ id, ...parsed, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
