import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'
import pool from '@/lib/db'
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

    const { rows } = await pool.query(
      `SELECT id, nome, email, senha, perfil, ativo FROM "Usuario" WHERE email = $1 LIMIT 1`,
      [email]
    )

    const usuario = rows[0]
    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const ok = await bcrypt.compare(senha, usuario.senha)
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = await signToken({
      id:     usuario.id,
      email:  usuario.email,
      perfil: usuario.perfil,
      nome:   usuario.nome,
    })

    const redirect =
      usuario.perfil === 'ADMIN' || usuario.perfil === 'ANALISTA'
        ? '/admin/dashboard'
        : '/cliente/dashboard'

    const res = NextResponse.json({ redirect, perfil: usuario.perfil, nome: usuario.nome })
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
