'use client'

import { useEffect, useState } from 'react'

type Cliente = {
  id: string; razaoSocial: string; nomeFantasia: string; cnpj: string
  email: string; telefone: string; whatsapp: string; segmento: string
  cep: string; endereco: string; cidade: string; estado: string
  responsavel: string; cargo: string; plano: string
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO'; observacoes: string
  ie: string; criadoEm: string
}

const EMPTY: Omit<Cliente, 'id' | 'criadoEm'> = {
  razaoSocial: '', nomeFantasia: '', cnpj: '', email: '', telefone: '',
  whatsapp: '', segmento: '', cep: '', endereco: '', cidade: '', estado: '',
  responsavel: '', cargo: '', plano: 'basico', status: 'ATIVO', observacoes: '', ie: '',
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  INATIVO:  'bg-white/10 text-white/50 border-white/20',
  SUSPENSO: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [modal, setModal]       = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')
  const [aba, setAba]           = useState<'dados' | 'endereco' | 'contato' | 'obs'>('dados')

  const carregar = () => {
    setLoading(true)
    fetch('/api/clientes').then(r => r.json()).then(d => { setClientes(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { carregar() }, [])

  const filtrados = clientes.filter(c =>
    c.razaoSocial?.toLowerCase().includes(busca.toLowerCase()) ||
    c.email?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj?.includes(busca)
  )

  function abrirNovo() {
    setForm({ ...EMPTY }); setEditId(null); setErro(''); setAba('dados'); setModal(true)
  }

  function abrirEditar(c: Cliente) {
    setForm({
      razaoSocial: c.razaoSocial ?? '', nomeFantasia: c.nomeFantasia ?? '',
      cnpj: c.cnpj ?? '', email: c.email ?? '', telefone: c.telefone ?? '',
      whatsapp: c.whatsapp ?? '', segmento: c.segmento ?? '', cep: c.cep ?? '',
      endereco: c.endereco ?? '', cidade: c.cidade ?? '', estado: c.estado ?? '',
      responsavel: c.responsavel ?? '', cargo: c.cargo ?? '', plano: c.plano ?? 'basico',
      status: c.status ?? 'ATIVO', observacoes: c.observacoes ?? '', ie: c.ie ?? '',
    })
    setEditId(c.id); setErro(''); setAba('dados'); setModal(true)
  }

  async function salvar() {
    setErro(''); setSalvando(true)
    const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? form : { ...form, documento: form.cnpj }
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSalvando(false)
    if (!res.ok) { setErro(data.error ?? 'Erro ao salvar'); return }
    setModal(false); carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    carregar()
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-white/50 text-sm mt-1">{clientes.length} cadastrado(s)</p>
        </div>
        <button
          onClick={abrirNovo}
          className="bg-ouro text-verde-dark font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-ouro-light transition-all"
        >
          + Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <input
        value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 transition-all"
      />

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-ouro border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">Nenhum cliente encontrado</p>
          <button onClick={abrirNovo} className="mt-3 text-ouro text-sm hover:underline">Cadastrar primeiro cliente</button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 font-medium px-5 py-3">Nome / Razão Social</th>
                  <th className="text-left text-white/40 font-medium px-5 py-3 hidden md:table-cell">CPF/CNPJ</th>
                  <th className="text-left text-white/40 font-medium px-5 py-3 hidden lg:table-cell">Cidade</th>
                  <th className="text-left text-white/40 font-medium px-5 py-3 hidden sm:table-cell">Segmento</th>
                  <th className="text-left text-white/40 font-medium px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-white font-medium">{c.razaoSocial}</p>
                      {c.nomeFantasia && <p className="text-white/40 text-xs">{c.nomeFantasia}</p>}
                      <p className="text-white/40 text-xs">{c.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-white/60 hidden md:table-cell">{c.cnpj || '—'}</td>
                    <td className="px-5 py-3.5 text-white/60 hidden lg:table-cell">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
                    <td className="px-5 py-3.5 text-white/60 hidden sm:table-cell">{c.segmento || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => abrirEditar(c)} className="text-white/40 hover:text-white transition-colors text-xs px-2 py-1 border border-white/10 rounded-lg">
                          Editar
                        </button>
                        <button onClick={() => excluir(c.id)} className="text-red-400/60 hover:text-red-400 transition-colors text-xs px-2 py-1 border border-red-400/20 rounded-lg">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d3d2a] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-white/10">
              {(['dados', 'endereco', 'contato', 'obs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAba(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors capitalize ${
                    aba === tab ? 'text-ouro border-b-2 border-ouro' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab === 'dados' ? 'Dados' : tab === 'endereco' ? 'Endereço' : tab === 'contato' ? 'Contatos' : 'Obs.'}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aba === 'dados' && (
                <>
                  <Row label="Razão Social / Nome *">
                    <Input value={form.razaoSocial} onChange={v => f('razaoSocial', v)} placeholder="Nome completo ou razão social" />
                  </Row>
                  <Row label="Nome Fantasia">
                    <Input value={form.nomeFantasia} onChange={v => f('nomeFantasia', v)} placeholder="Nome fantasia (opcional)" />
                  </Row>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="CPF / CNPJ *">
                      <Input value={form.cnpj} onChange={v => f('cnpj', v)} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                    </Row>
                    <Row label="IE / RG">
                      <Input value={form.ie} onChange={v => f('ie', v)} placeholder="Inscrição Estadual ou RG" />
                    </Row>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="Segmento">
                      <Input value={form.segmento} onChange={v => f('segmento', v)} placeholder="Ex: Tecnologia, Saúde..." />
                    </Row>
                    <Row label="Plano">
                      <Select value={form.plano} onChange={v => f('plano', v)}>
                        <option value="basico">Básico</option>
                        <option value="intermediario">Intermediário</option>
                        <option value="premium">Premium</option>
                      </Select>
                    </Row>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="Responsável">
                      <Input value={form.responsavel} onChange={v => f('responsavel', v)} placeholder="Nome do responsável" />
                    </Row>
                    <Row label="Cargo">
                      <Input value={form.cargo} onChange={v => f('cargo', v)} placeholder="Cargo ou função" />
                    </Row>
                  </div>
                  <Row label="Status">
                    <Select value={form.status} onChange={v => f('status', v)}>
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                      <option value="SUSPENSO">Suspenso</option>
                    </Select>
                  </Row>
                </>
              )}

              {aba === 'endereco' && (
                <>
                  <Row label="CEP">
                    <Input value={form.cep} onChange={v => f('cep', v)} placeholder="00000-000" />
                  </Row>
                  <Row label="Endereço">
                    <Input value={form.endereco} onChange={v => f('endereco', v)} placeholder="Rua, número, complemento" />
                  </Row>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="Cidade">
                      <Input value={form.cidade} onChange={v => f('cidade', v)} placeholder="Cidade" />
                    </Row>
                    <Row label="Estado">
                      <Input value={form.estado} onChange={v => f('estado', v)} placeholder="UF" maxLength={2} />
                    </Row>
                  </div>
                </>
              )}

              {aba === 'contato' && (
                <>
                  <Row label="E-mail *">
                    <Input value={form.email} onChange={v => f('email', v)} placeholder="email@empresa.com" type="email" />
                  </Row>
                  <Row label="Telefone">
                    <Input value={form.telefone} onChange={v => f('telefone', v)} placeholder="(11) 3000-0000" />
                  </Row>
                  <Row label="WhatsApp">
                    <Input value={form.whatsapp} onChange={v => f('whatsapp', v)} placeholder="(11) 90000-0000" />
                  </Row>
                </>
              )}

              {aba === 'obs' && (
                <Row label="Observações">
                  <textarea
                    value={form.observacoes}
                    onChange={e => f('observacoes', e.target.value)}
                    rows={6}
                    placeholder="Histórico, observações gerais, documentos, contratos..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 transition-all resize-none"
                  />
                </Row>
              )}

              {erro && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
                  {erro}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="bg-ouro text-verde-dark font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-ouro-light transition-all disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} maxLength={maxLength}
      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 transition-all"
    />
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 transition-all [&>option]:text-black [&>option]:bg-white"
    >
      {children}
    </select>
  )
}
