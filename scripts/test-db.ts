import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nome, email, perfil')
    .limit(5)

  if (error) { console.error('ERRO:', error); process.exit(1) }
  console.log('✔ Conexão OK! Usuários encontrados:', data?.length)
  console.table(data?.map(u => ({ nome: u.nome, email: u.email, perfil: u.perfil })))
}

main()
