import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const senhaAdmin = await bcrypt.hash('Helmigui@2025', 12)

  await pool.query(`
    INSERT INTO "Usuario" (id, nome, email, senha, perfil, ativo, "criadoEm", "atualizadoEm")
    VALUES (
      gen_random_uuid()::text,
      'Administrador Helmigui',
      'admin@helmigui.com.br',
      $1,
      'ADMIN',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET senha = $1, ativo = true
  `, [senhaAdmin])

  console.log('✔ Admin criado: admin@helmigui.com.br / Helmigui@2025')
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
