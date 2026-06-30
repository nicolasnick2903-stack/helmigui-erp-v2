import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  numero:       z.string().optional(),
  emitente:     z.string().optional(),
  cnpjEmitente: z.string().optional(),
  valor:        z.number().min(0).optional(),
  dataEmissao:  z.string().optional(),
  vencimento:   z.string().optional(),
  tipo:         z.string().optional(),
  categoria:    z.string().optional(),
  fluxo:        z.enum(['ENTRADA', 'SAIDA']).optional(),
  status:       z.enum(['PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA']).optional(),
  observacoes:  z.string().optional(),
  dataPagamento: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = schema.parse(body)

    const { data, error } = await supabase
      .from('Nota')
      .update({ ...parsed, atualizadoEm: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { error } = await supabase.from('Nota').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
