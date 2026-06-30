import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  razaoSocial:  z.string().min(2),
  nomeFantasia: z.string().optional(),
  tipoPessoa:   z.enum(['PF', 'PJ']).default('PJ'),
  documento:    z.string().min(1),
  ie:           z.string().optional(),
  email:        z.string().email(),
  telefone:     z.string().optional(),
  whatsapp:     z.string().optional(),
  segmento:     z.string().optional(),
  cep:          z.string().optional(),
  endereco:     z.string().optional(),
  cidade:       z.string().optional(),
  estado:       z.string().optional(),
  responsavel:  z.string().optional(),
  cargo:        z.string().optional(),
  plano:        z.string().default('basico'),
  status:       z.enum(['ATIVO', 'INATIVO', 'SUSPENSO']).default('ATIVO'),
  observacoes:  z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('Cliente')
    .select('*, usuario:Usuario(nome, email)')
    .order('criadoEm', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = schema.parse(body)

    // Cria usuário para o cliente
    const { data: userExist } = await supabase
      .from('Usuario')
      .select('id')
      .eq('email', parsed.email)
      .single()

    let usuarioId: string

    if (userExist) {
      usuarioId = userExist.id
    } else {
      const bcrypt = await import('bcryptjs')
      const senha  = await bcrypt.hash('Helmigui@2025', 10)
      const { data: novoUser, error: errUser } = await supabase
        .from('Usuario')
        .insert({ nome: parsed.razaoSocial, email: parsed.email, senha, perfil: 'CLIENTE', ativo: true })
        .select('id')
        .single()
      if (errUser) return NextResponse.json({ error: errUser.message }, { status: 500 })
      usuarioId = novoUser!.id
    }

    const { data: clienteExist } = await supabase
      .from('Cliente')
      .select('id')
      .eq('usuarioId', usuarioId)
      .single()

    if (clienteExist) {
      return NextResponse.json({ error: 'Cliente com este e-mail já existe' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('Cliente')
      .insert({
        usuarioId,
        razaoSocial:  parsed.razaoSocial,
        nomeFantasia: parsed.nomeFantasia,
        cnpj:         parsed.documento,
        ie:           parsed.ie,
        email:        parsed.email,
        telefone:     parsed.telefone,
        whatsapp:     parsed.whatsapp,
        segmento:     parsed.segmento,
        cep:          parsed.cep,
        endereco:     parsed.endereco,
        cidade:       parsed.cidade,
        estado:       parsed.estado,
        responsavel:  parsed.responsavel,
        cargo:        parsed.cargo,
        plano:        parsed.plano,
        status:       parsed.status,
        observacoes:  parsed.observacoes,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', issues: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
