import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const email = 'admin@helmigui.com.br'
  const senha = 'Helmigui@2025'

  console.log('Buscando usuário...')
  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nome, email, senha, perfil, ativo')
    .eq('email', email)
    .single()

  console.log('data:', data ? { ...data, senha: data.senha?.substring(0, 20) + '...' } : null)
  console.log('error:', error)

  if (error || !data) { console.log('FALHA: usuário não encontrado'); return }
  console.log('ativo:', data.ativo)

  const ok = await bcrypt.compare(senha, data.senha)
  console.log('senha ok:', ok)
}

main().catch(console.error)
