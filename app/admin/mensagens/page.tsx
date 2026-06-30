'use client'

import { useState, useEffect } from 'react'

type Cliente = {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  whatsapp: string | null
  telefone: string | null
  status: string
  segmento: string | null
}

function limparTelefone(tel: string) {
  return tel.replace(/\D/g, '')
}

function linkWhatsApp(numero: string, nome: string) {
  const num = limparTelefone(numero)
  const numBR = num.startsWith('55') ? num : `55${num}`
  const msg = encodeURIComponent(`Olá, ${nome}! 👋`)
  return `https://wa.me/${numBR}?text=${msg}`
}

export default function MensagensPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca]       = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then(d => { setClientes(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtrados = clientes.filter(c => {
    const texto = (c.razaoSocial + (c.nomeFantasia ?? '') + (c.whatsapp ?? '') + (c.telefone ?? ''))
      .toLowerCase()
    return texto.includes(busca.toLowerCase())
  })

  const comWhats   = filtrados.filter(c => c.whatsapp)
  const semWhats   = filtrados.filter(c => !c.whatsapp)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white font-bold text-2xl">Mensagens</h1>
        <p className="text-white/40 text-sm mt-1">
          Clique em um cliente para abrir o WhatsApp diretamente
        </p>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente por nome ou número..."
          className="w-full bg-verde-dark/60 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/40 text-sm">
          Carregando clientes...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/40 text-sm">
          Nenhum cliente encontrado
        </div>
      ) : (
        <div className="space-y-6">

          {/* Com WhatsApp */}
          {comWhats.length > 0 && (
            <div>
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3 px-1">
                Com WhatsApp ({comWhats.length})
              </p>
              <div className="space-y-2">
                {comWhats.map(c => (
                  <a
                    key={c.id}
                    href={linkWhatsApp(c.whatsapp!, c.razaoSocial)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-verde-dark/60 border border-white/10 hover:border-[#25D366]/40 hover:bg-[#25D366]/10 rounded-2xl px-5 py-4 transition-all group"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-ouro/20 border border-ouro/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-ouro font-bold text-base">
                        {c.razaoSocial[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate group-hover:text-white">
                        {c.razaoSocial}
                      </p>
                      {c.nomeFantasia && (
                        <p className="text-white/40 text-xs truncate">{c.nomeFantasia}</p>
                      )}
                      <p className="text-[#25D366] text-xs mt-0.5 font-medium">
                        {c.whatsapp}
                      </p>
                    </div>

                    {/* WhatsApp icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 group-hover:bg-[#25D366]/30 flex items-center justify-center flex-shrink-0 transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sem WhatsApp */}
          {semWhats.length > 0 && (
            <div>
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3 px-1">
                Sem WhatsApp cadastrado ({semWhats.length})
              </p>
              <div className="space-y-2">
                {semWhats.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 bg-verde-dark/40 border border-white/5 rounded-2xl px-5 py-4 opacity-50"
                  >
                    <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-white/50 font-bold text-base">
                        {c.razaoSocial[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 font-medium text-sm truncate">{c.razaoSocial}</p>
                      {c.nomeFantasia && (
                        <p className="text-white/30 text-xs truncate">{c.nomeFantasia}</p>
                      )}
                      <p className="text-white/25 text-xs mt-0.5">WhatsApp não cadastrado</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
