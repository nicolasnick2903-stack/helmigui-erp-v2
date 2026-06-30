import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: cliente, error } = await supabase
    .from('Cliente')
    .select('id, razaoSocial, nomeFantasia, cnpj, email, whatsapp, segmento, plano, status, dataInicio')
    .eq('usuarioId', session.id)
    .single()

  if (error || !cliente) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ...cliente, nome: session.nome, perfil: session.perfil })
}
