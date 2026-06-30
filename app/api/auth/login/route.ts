import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, senha } = schema.parse(body)

    const { data, error } = await supabase
      .from('Usuario')
      .select('id, nome, email, senha, perfil, ativo')
      .eq('email', email)
      .single()

    if (error || !data || !data.ativo) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const ok = await bcrypt.compare(senha, data.senha)
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = await signToken({
      id:     data.id,
      email:  data.email,
      perfil: data.perfil,
      nome:   data.nome,
    })

    const redirect =
      data.perfil === 'ADMIN' || data.perfil === 'ANALISTA'
        ? '/admin/dashboard'
        : '/cliente/dashboard'

    const res = NextResponse.json({ redirect, perfil: data.perfil, nome: data.nome })
    res.cookies.set('helmigui_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    return res
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
