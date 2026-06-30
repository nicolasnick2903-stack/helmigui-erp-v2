'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Perfil = {
  id: string; nome: string; razaoSocial: string; nomeFantasia: string | null
  cnpj: string; plano: string; status: string
}

type Nota = {
  id: string; valor: number; dataEmissao: string | null; vencimento: string | null
  status: 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA'
  fluxo: 'ENTRADA' | 'SAIDA'; categoria: string | null
  emitente: string | null; numero: string | null; criadoEm: string
}

type FormNota = {
  valor: string; vencimento: string; dataEmissao: string
  categoria: string; outrosDescricao: string; emitente: string
  numero: string; fluxo: string; observacoes: string
}

const FORM_VAZIO: FormNota = {
  valor: '', vencimento: '', dataEmissao: '', categoria: 'servico',
  outrosDescricao: '', emitente: '', numero: '', fluxo: 'SAIDA', observacoes: '',
}

const STATUS_COR: Record<string, string> = {
  PAGA:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDENTE:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ATRASADA:  'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELADA: 'bg-white/10 text-white/30 border-white/10',
}

const STATUS_LABEL: Record<string, string> = {
  PAGA: 'Paga', PENDENTE: 'Pendente', ATRASADA: 'Atrasada', CANCELADA: 'Cancelada',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function isAtrasada(n: Nota) {
  return n.status === 'PENDENTE' && !!n.vencimento && new Date(n.vencimento) < new Date()
}

function extrairDadosOCR(texto: string): Partial<FormNota> {
  const result: Partial<FormNota> = {}

  // Valor — padrões brasileiros: R$ 1.234,56 ou TOTAL: 1234.56
  const valorMatch =
    texto.match(/R\$\s*([\d.,]+)/i) ||
    texto.match(/(?:VALOR\s*TOTAL|TOTAL\s*NOTA|TOTAL\s*NF|TOTAL)[:\s]+(?:R\$\s*)?([\d.,]+)/i) ||
    texto.match(/(?:TOTAL)[:\s]+([\d.,]+)/i)
  if (valorMatch) {
    const raw = valorMatch[1].replace(/\./g, '').replace(',', '.')
    const num = parseFloat(raw)
    if (!isNaN(num) && num > 0) result.valor = num.toFixed(2)
  }

  // Data de vencimento
  const vencMatch =
    texto.match(/(?:VENC(?:IMENTO)?|DATA\s+VEN)[.:\s]+(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i) ||
    texto.match(/(?:VENC(?:IMENTO)?)[:\s]+(\d{2}\/\d{2}\/\d{4})/i)
  if (vencMatch) {
    const [d, m, y] = vencMatch[1].split(/[\/.-]/)
    result.vencimento = `${y}-${m}-${d}`
  }

  // Data de emissão
  const emissMatch =
    texto.match(/(?:DATA\s*(?:DE\s*)?EMISS[ÃA]O|EMISS[ÃA]O)[:\s]+(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i)
  if (emissMatch) {
    const [d, m, y] = emissMatch[1].split(/[\/.-]/)
    result.dataEmissao = `${y}-${m}-${d}`
  }

  // Emitente — razão social ou nome
  const emitenteMatch =
    texto.match(/(?:PRESTADOR|EMITENTE|EMPRESA)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s.&]{3,50})/i)
  if (emitenteMatch) result.emitente = emitenteMatch[1].trim()

  // Número da nota
  const numMatch = texto.match(/(?:NF[SE]?|NOTA\s+FISCAL|N[°º.])\s*[:\s]?(\d{3,12})/i)
  if (numMatch) result.numero = numMatch[1]

  // Categoria
  if (/ISS|IMPOSTO\s+SOBRE\s+SERVI[ÇC]O|NFSE|NOTA\s+FISCAL\s+DE\s+SERVI[ÇC]O/i.test(texto)) {
    result.categoria = 'servico'
  } else if (/DARF|IRPF|IRPJ|CSLL|PIS|COFINS|INSS|TRIBUTO|IMPOSTO/i.test(texto)) {
    result.categoria = 'imposto'
  }

  return result
}

export default function ClienteDashboard() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [perfil,   setPerfil]   = useState<Perfil | null>(null)
  const [notas,    setNotas]    = useState<Nota[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState<FormNota>(FORM_VAZIO)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [arquivo,  setArquivo]  = useState<File | null>(null)
  const [ocrStatus, setOCR]     = useState<string>('')
  const [ocrFeito, setOCRFeito] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/cliente/perfil').then(r => r.json()),
      fetch('/api/cliente/notas').then(r => r.json()),
    ]).then(([p, n]) => {
      if (p.error) { router.push('/login'); return }
      setPerfil(p)
      const lista: Nota[] = Array.isArray(n) ? n : []
      setNotas(lista.map(nota => isAtrasada(nota) ? { ...nota, status: 'ATRASADA' as const } : nota))
      setLoading(false)
    })
  }, [router])

  const f = (k: keyof FormNota, v: string) => setForm(p => ({ ...p, [k]: v }))

  const totalEntrada = notas.filter(n => n.fluxo === 'ENTRADA').reduce((s, n) => s + n.valor, 0)
  const totalSaida   = notas.filter(n => n.fluxo === 'SAIDA').reduce((s, n) => s + n.valor, 0)
  const lucro        = totalEntrada - totalSaida
  const qtdAtrasada  = notas.filter(n => n.status === 'ATRASADA').length

  function abrirModal() {
    setModal(true); setForm(FORM_VAZIO); setPreview(null)
    setArquivo(null); setOCR(''); setOCRFeito(false); setErro('')
  }

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file); setOCRFeito(false); setOCR('')
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  const lerNota = useCallback(async () => {
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) {
      setOCR('⚠️ Somente imagens são suportadas para leitura automática.')
      return
    }
    try {
      setOCR('Carregando leitor de texto...')
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOCR(`Lendo nota: ${Math.round(m.progress * 100)}%`)
          } else if (m.status === 'loading language traineddata') {
            setOCR('Baixando dados de idioma...')
          }
        },
      })
      setOCR('Analisando imagem...')
      const { data: { text } } = await worker.recognize(arquivo)
      await worker.terminate()

      const extraido = extrairDadosOCR(text)
      setForm(prev => ({ ...prev, ...extraido }))
      setOCRFeito(true)

      const campos = Object.keys(extraido).filter(k => k !== 'outrosDescricao').length
      if (campos === 0) {
        setOCR('⚠️ Não foi possível extrair dados automaticamente. Preencha manualmente.')
      } else {
        setOCR(`✅ ${campos} campo(s) extraído(s) automaticamente. Confira e ajuste se necessário.`)
      }
    } catch {
      setOCR('❌ Erro ao processar a imagem. Preencha os dados manualmente.')
    }
  }, [arquivo])

  async function salvar() {
    if (!form.valor) { setErro('Informe o valor da nota'); return }
    setSaving(true); setErro('')

    const cat = form.categoria === 'outros' ? form.outrosDescricao || 'Outros' : form.categoria

    const res = await fetch('/api/cliente/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor:       parseFloat(form.valor) || 0,
        vencimento:  form.vencimento  || undefined,
        dataEmissao: form.dataEmissao || undefined,
        categoria:   cat,
        emitente:    form.emitente    || undefined,
        numero:      form.numero      || undefined,
        fluxo:       form.fluxo,
        observacoes: form.observacoes || undefined,
        status:      'PENDENTE',
      }),
    })

    if (res.ok) {
      const nova = await res.json()
      const c = isAtrasada(nova) ? { ...nova, status: 'ATRASADA' as const } : nova
      setNotas(prev => [c, ...prev])
      setModal(false)
    } else {
      const d = await res.json()
      setErro(d.error || 'Erro ao salvar')
    }
    setSaving(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d3d2a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ouro border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d3d2a]">

      {/* ── HEADER ── */}
      <header className="bg-[#0a2e1f] border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-ouro rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-[#0d3d2a] font-black text-lg">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Helmigui ERP</p>
            <p className="text-white/40 text-xs">{perfil?.razaoSocial}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={abrirModal}
            className="bg-ouro text-[#0d3d2a] font-bold text-sm px-4 py-2 rounded-xl hover:bg-ouro/90 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Lançar Nota
          </button>
          <button
            onClick={logout}
            className="text-white/40 hover:text-white text-sm transition-colors hidden sm:block"
          >
            Sair →
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── CARDS FINANCEIROS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card
            label="Receitas"
            value={fmt(totalEntrada)}
            cor="text-emerald-400"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            }
            iconBg="bg-emerald-500/20 text-emerald-400"
          />
          <Card
            label="Despesas"
            value={fmt(totalSaida)}
            cor="text-red-400"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
            }
            iconBg="bg-red-500/20 text-red-400"
          />
          <Card
            label="Lucro"
            value={fmt(lucro)}
            cor={lucro >= 0 ? 'text-ouro' : 'text-red-400'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            }
            iconBg="bg-ouro/20 text-ouro"
          />
          <Card
            label="Atrasadas"
            value={String(qtdAtrasada)}
            cor={qtdAtrasada > 0 ? 'text-red-400' : 'text-white/40'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            }
            iconBg={qtdAtrasada > 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/30'}
          />
        </div>

        {/* ── LISTA DE NOTAS ── */}
        <div className="bg-[#0a2e1f]/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-bold">Minhas Notas Fiscais</h2>
            <span className="text-white/30 text-sm">{notas.length} nota(s)</span>
          </div>

          {notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-white/40 text-sm">Nenhuma nota lançada ainda</p>
              <button onClick={abrirModal} className="text-ouro text-sm hover:underline">
                Lançar primeira nota →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notas.map(nota => (
                <div key={nota.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    nota.fluxo === 'ENTRADA' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={nota.fluxo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}
                    >
                      {nota.fluxo === 'ENTRADA'
                        ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                        : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                      }
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {nota.numero && <span className="text-white/30 text-xs font-mono">#{nota.numero}</span>}
                      <span className="text-white text-sm font-medium truncate">
                        {nota.emitente || nota.categoria || 'Nota Fiscal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-white/40 text-xs">{nota.categoria}</span>
                      {nota.vencimento && (
                        <span className={`text-xs ${nota.status === 'ATRASADA' ? 'text-red-400' : 'text-white/30'}`}>
                          Vence: {fmtDate(nota.vencimento)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-bold text-sm ${nota.fluxo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {nota.fluxo === 'SAIDA' ? '− ' : '+ '}{fmt(nota.valor)}
                    </span>
                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${STATUS_COR[nota.status]}`}>
                      {STATUS_LABEL[nota.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: LANÇAR NOTA ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0a2e1f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-white font-bold text-lg">Lançar Nota Fiscal</h3>
                <p className="text-white/40 text-sm">Tire uma foto ou preencha manualmente</p>
              </div>
              <button onClick={() => setModal(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Área de upload / câmera */}
              <div>
                <label className="text-white/50 text-xs font-medium block mb-2">
                  FOTO OU ARQUIVO DA NOTA
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onArquivo}
                  className="hidden"
                />

                {!preview ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-ouro/50 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-ouro/10 flex items-center justify-center transition-all">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30 group-hover:text-ouro">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-sm">Tire uma foto ou selecione a imagem</p>
                      <p className="text-white/25 text-xs mt-1">Suporta JPG, PNG, HEIC</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-xl bg-black/20" />
                    <button
                      onClick={() => { setPreview(null); setArquivo(null); setOCR(''); setOCRFeito(false) }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full text-white text-sm flex items-center justify-center hover:bg-red-500/80"
                    >✕</button>
                  </div>
                )}

                {/* Botão OCR */}
                {arquivo && !ocrFeito && (
                  <button
                    onClick={lerNota}
                    disabled={!!ocrStatus && !ocrStatus.startsWith('✅') && !ocrStatus.startsWith('⚠️') && !ocrStatus.startsWith('❌')}
                    className="mt-3 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.55"/>
                    </svg>
                    Ler nota automaticamente
                  </button>
                )}

                {ocrStatus && (
                  <p className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                    ocrStatus.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                    ocrStatus.startsWith('⚠️') || ocrStatus.startsWith('❌') ? 'bg-red-500/10 text-red-400' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {ocrStatus}
                  </p>
                )}
              </div>

              {/* Linha divisória */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/20 text-xs">DADOS DA NOTA</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {erro && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">{erro}</div>
              )}

              {/* Campos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Número</label>
                  <input
                    value={form.numero} onChange={e => f('numero', e.target.value)}
                    placeholder="001"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Valor (R$) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.valor} onChange={e => f('valor', e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Emitente</label>
                <input
                  value={form.emitente} onChange={e => f('emitente', e.target.value)}
                  placeholder="Nome de quem emitiu a nota"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Emissão</label>
                  <input
                    type="date" value={form.dataEmissao} onChange={e => f('dataEmissao', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1.5">Vencimento</label>
                  <input
                    type="date" value={form.vencimento} onChange={e => f('vencimento', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-ouro/50 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-white/50 text-xs block mb-2">CATEGORIA</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'servico', label: 'Serviço',  icon: '🔧' },
                    { val: 'imposto', label: 'Imposto',  icon: '🏛️' },
                    { val: 'outros',  label: 'Outros',   icon: '📋' },
                  ].map(op => (
                    <button
                      key={op.val}
                      onClick={() => f('categoria', op.val)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm transition-all ${
                        form.categoria === op.val
                          ? 'bg-ouro/20 border-ouro/50 text-ouro font-medium'
                          : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <span>{op.icon}</span>
                      <span>{op.label}</span>
                    </button>
                  ))}
                </div>

                {/* Campo manual para "outros" */}
                {form.categoria === 'outros' && (
                  <input
                    value={form.outrosDescricao}
                    onChange={e => f('outrosDescricao', e.target.value)}
                    placeholder="Descreva o tipo de gasto..."
                    autoFocus
                    className="mt-3 w-full bg-white/10 border border-ouro/30 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50"
                  />
                )}
              </div>

              {/* Fluxo */}
              <div>
                <label className="text-white/50 text-xs block mb-2">TIPO</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'SAIDA',   label: 'Despesa',  desc: 'Paguei / Gasto', cor: 'border-red-500/50 bg-red-500/10 text-red-400' },
                    { val: 'ENTRADA', label: 'Receita',  desc: 'Recebi / Entrada', cor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
                  ].map(op => (
                    <button
                      key={op.val}
                      onClick={() => f('fluxo', op.val)}
                      className={`py-3 rounded-xl border text-sm transition-all ${
                        form.fluxo === op.val
                          ? op.cor + ' font-medium'
                          : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-medium">{op.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{op.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes} onChange={e => f('observacoes', e.target.value)}
                  placeholder="Observações adicionais..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setModal(false)}
                className="flex-1 border border-white/20 text-white/60 rounded-xl py-3 text-sm hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving || !form.valor}
                className="flex-1 bg-ouro text-[#0d3d2a] font-bold rounded-xl py-3 text-sm hover:bg-ouro/90 disabled:opacity-50 transition-colors"
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

function Card({ label, value, cor, icon, iconBg }: {
  label: string; value: string; cor: string
  icon: React.ReactNode; iconBg: string
}) {
  return (
    <div className="bg-[#0a2e1f]/80 border border-white/10 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg leading-tight ${cor}`}>{value}</p>
    </div>
  )
}
