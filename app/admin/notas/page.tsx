'use client'

import { useState, useEffect, useCallback } from 'react'

type Cliente = {
  id: string; razaoSocial: string; nomeFantasia: string | null
  status: string; cnpj: string; segmento: string | null
}

type Nota = {
  id: string; clienteId: string; numero: string | null; emitente: string | null
  valor: number; dataEmissao: string | null; vencimento: string | null
  status: 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA'
  fluxo: 'ENTRADA' | 'SAIDA'; categoria: string | null; observacoes: string | null
  criadoEm: string
}

const STATUS_NOTA: Record<string, string> = {
  PAGA:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDENTE:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ATRASADA:  'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELADA: 'bg-white/10 text-white/40 border-white/20',
}

const STATUS_LABEL: Record<string, string> = {
  PAGA: 'Paga', PENDENTE: 'Pendente', ATRASADA: 'Atrasada', CANCELADA: 'Cancelada',
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function isAtrasada(nota: Nota) {
  if (nota.status !== 'PENDENTE' || !nota.vencimento) return false
  return new Date(nota.vencimento) < new Date()
}

const EMPTY_FORM = {
  numero: '', emitente: '', valor: '', vencimento: '', dataEmissao: '',
  fluxo: 'ENTRADA', status: 'PENDENTE', categoria: '', observacoes: '',
}

export default function NotasPage() {
  const [clientes,   setClientes]   = useState<Cliente[]>([])
  const [notas,      setNotas]      = useState<Nota[]>([])
  const [selected,   setSelected]   = useState<Cliente | null>(null)
  const [busca,      setBusca]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [loadingN,   setLoadingN]   = useState(false)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [erro,       setErro]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [marcando,   setMarcando]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => {
      setClientes(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const loadNotas = useCallback((clienteId: string) => {
    setLoadingN(true)
    fetch(`/api/notas?clienteId=${clienteId}`)
      .then(r => r.json())
      .then(d => {
        const list: Nota[] = Array.isArray(d) ? d : []
        setNotas(list.map(n => isAtrasada(n) ? { ...n, status: 'ATRASADA' } : n))
        setLoadingN(false)
      })
  }, [])

  function selectCliente(c: Cliente) {
    setSelected(c)
    loadNotas(c.id)
  }

  async function marcarPaga(nota: Nota) {
    setMarcando(nota.id)
    const newStatus = nota.status === 'PAGA' ? 'PENDENTE' : 'PAGA'
    const res = await fetch(`/api/notas/${nota.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setNotas(prev => prev.map(n => n.id === nota.id ? { ...n, status: newStatus as Nota['status'] } : n))
    }
    setMarcando(null)
  }

  async function salvar() {
    if (!selected) return
    setSaving(true); setErro('')
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: selected.id,
        numero:    form.numero || undefined,
        emitente:  form.emitente || undefined,
        valor:     parseFloat(form.valor) || 0,
        dataEmissao: form.dataEmissao || undefined,
        vencimento:  form.vencimento  || undefined,
        fluxo:   form.fluxo,
        status:  form.status,
        categoria:   form.categoria   || undefined,
        observacoes: form.observacoes || undefined,
      }),
    })
    if (res.ok) {
      const nova = await res.json()
      setNotas(prev => [isAtrasada(nova) ? { ...nova, status: 'ATRASADA' } : nova, ...prev])
      setModal(false); setForm(EMPTY_FORM)
    } else {
      const d = await res.json()
      setErro(d.error || 'Erro ao salvar')
    }
    setSaving(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta nota?')) return
    await fetch(`/api/notas/${id}`, { method: 'DELETE' })
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  const clientesFiltrados = clientes.filter(c =>
    (c.razaoSocial + (c.nomeFantasia ?? '') + c.cnpj)
      .toLowerCase().includes(busca.toLowerCase())
  )

  const totalPendente = notas.filter(n => n.status === 'PENDENTE' || n.status === 'ATRASADA').reduce((s, n) => s + n.valor, 0)
  const totalPago     = notas.filter(n => n.status === 'PAGA').reduce((s, n) => s + n.valor, 0)
  const qtdAtrasada   = notas.filter(n => n.status === 'ATRASADA').length

  return (
    <div className="h-[calc(100vh-5.5rem)] flex gap-4">

      {/* ── PAINEL ESQUERDO: Clientes ── */}
      <div className="w-72 flex-shrink-0 bg-verde-dark/60 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-bold text-sm mb-3">Clientes</h2>
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-white/40 text-sm">Carregando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/40 text-sm">Nenhum cliente</div>
          ) : (
            clientesFiltrados.map(c => (
              <button
                key={c.id}
                onClick={() => selectCliente(c)}
                className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-all ${
                  selected?.id === c.id
                    ? 'bg-ouro/20 border-l-2 border-l-ouro'
                    : 'hover:bg-white/5'
                }`}
              >
                <p className={`text-sm font-medium truncate ${selected?.id === c.id ? 'text-ouro' : 'text-white'}`}>
                  {c.razaoSocial}
                </p>
                {c.nomeFantasia && (
                  <p className="text-xs text-white/40 truncate mt-0.5">{c.nomeFantasia}</p>
                )}
                <p className="text-xs text-white/30 mt-0.5">{c.cnpj || '—'}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── PAINEL DIREITO: Notas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p className="text-white/50 text-sm">Selecione um cliente para ver as notas fiscais</p>
          </div>
        ) : (
          <>
            {/* Header do cliente selecionado */}
            <div className="bg-verde-dark/60 border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold">{selected.razaoSocial}</h2>
                {selected.nomeFantasia && <p className="text-white/50 text-sm">{selected.nomeFantasia}</p>}
              </div>

              {/* Mini stats */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white/40 text-xs">A Receber</p>
                  <p className="text-yellow-400 font-bold text-sm">{fmt(totalPendente)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs">Recebido</p>
                  <p className="text-emerald-400 font-bold text-sm">{fmt(totalPago)}</p>
                </div>
                {qtdAtrasada > 0 && (
                  <div className="text-right">
                    <p className="text-white/40 text-xs">Atrasadas</p>
                    <p className="text-red-400 font-bold text-sm">{qtdAtrasada}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setModal(true); setErro('') }}
                className="bg-ouro text-verde-dark font-bold text-sm px-4 py-2 rounded-xl hover:bg-ouro/90 transition-colors flex-shrink-0"
              >
                + Nova Nota
              </button>
            </div>

            {/* Lista de notas */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingN ? (
                <div className="flex items-center justify-center h-40 text-white/40 text-sm">Carregando notas...</div>
              ) : notas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <p className="text-white/40 text-sm">Nenhuma nota fiscal para este cliente</p>
                  <button
                    onClick={() => { setModal(true); setErro('') }}
                    className="text-ouro text-sm hover:underline"
                  >
                    Adicionar primeira nota →
                  </button>
                </div>
              ) : (
                notas.map(nota => (
                  <div
                    key={nota.id}
                    className="bg-verde-dark/60 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4"
                  >
                    {/* Ícone fluxo */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      nota.fluxo === 'ENTRADA' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={nota.fluxo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}
                      >
                        {nota.fluxo === 'ENTRADA'
                          ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                          : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                        }
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {nota.numero && (
                          <span className="text-white/40 text-xs font-mono">#{nota.numero}</span>
                        )}
                        <span className="text-white font-medium text-sm truncate">
                          {nota.emitente || 'Nota Fiscal'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-white font-bold">{fmt(nota.valor)}</span>
                        <div className="flex items-center gap-1 text-white/40 text-xs">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Vence: {fmtDate(nota.vencimento)}
                        </div>
                        {nota.dataEmissao && (
                          <span className="text-white/30 text-xs hidden sm:inline">
                            Emitida: {fmtDate(nota.dataEmissao)}
                          </span>
                        )}
                        {nota.categoria && (
                          <span className="text-white/30 text-xs hidden md:inline">{nota.categoria}</span>
                        )}
                      </div>
                    </div>

                    {/* Status + ações */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_NOTA[nota.status]}`}>
                        {STATUS_LABEL[nota.status]}
                      </span>

                      {/* Toggle paga/pendente */}
                      {nota.status !== 'CANCELADA' && (
                        <button
                          onClick={() => marcarPaga(nota)}
                          disabled={marcando === nota.id}
                          title={nota.status === 'PAGA' ? 'Marcar como pendente' : 'Marcar como paga'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            nota.status === 'PAGA'
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-white/10 text-white/40 hover:bg-white/20'
                          }`}
                        >
                          {marcando === nota.id ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Excluir */}
                      <button
                        onClick={() => excluir(nota.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL: Nova Nota ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f4a32] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-lg">Nova Nota Fiscal</h3>
                <p className="text-white/40 text-sm">{selected?.razaoSocial}</p>
              </div>
              <button onClick={() => setModal(false)} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {erro && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">{erro}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Número da Nota</label>
                  <input
                    value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                    placeholder="001"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Valor (R$) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                    placeholder="0,00"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Emitente</label>
                <input
                  value={form.emitente} onChange={e => setForm(p => ({ ...p, emitente: e.target.value }))}
                  placeholder="Nome da empresa emitente"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Data de Emissão</label>
                  <input
                    type="date"
                    value={form.dataEmissao} onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Data de Vencimento</label>
                  <input
                    type="date"
                    value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Fluxo</label>
                  <select
                    value={form.fluxo} onChange={e => setForm(p => ({ ...p, fluxo: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [&>option]:text-black [&>option]:bg-white"
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Status</label>
                  <select
                    value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [&>option]:text-black [&>option]:bg-white"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGA">Paga</option>
                    <option value="ATRASADA">Atrasada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Categoria</label>
                <input
                  value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  placeholder="Ex: Serviços, Produtos..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Observações adicionais..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-white/10">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-white/20 text-white/60 rounded-xl py-2.5 text-sm hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving || !form.valor}
                className="flex-1 bg-ouro text-verde-dark font-bold rounded-xl py-2.5 text-sm hover:bg-ouro/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar Nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
