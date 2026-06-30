import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  razaoSocial:  z.string().min(2).optional(),
  nomeFantasia: z.string().optional(),
  documento:    z.string().optional(),
  ie:           z.string().optional(),
  email:        z.string().email().optional(),
  telefone:     z.string().optional(),
  whatsapp:     z.string().optional(),
  segmento:     z.string().optional(),
  cep:          z.string().optional(),
  endereco:     z.string().optional(),
  cidade:       z.string().optional(),
  estado:       z.string().optional(),
  responsavel:  z.string().optional(),
  cargo:        z.string().optional(),
  plano:        z.string().optional(),
  status:       z.enum(['ATIVO', 'INATIVO', 'SUSPENSO']).optional(),
  observacoes:  z.string().optional(),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('Cliente')
    .select('*, usuario:Usuario(nome, email), lancamentos:Lancamento(*), contratos:Contrato(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = schema.parse(body)

    const patch: Record<string, unknown> = { ...parsed }
    if (parsed.documento) { patch.cnpj = parsed.documento; delete patch.documento }

    const { data, error } = await supabase
      .from('Cliente')
      .update({ ...patch, atualizadoEm: new Date().toISOString() })
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

  const { error } = await supabase.from('Cliente').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
