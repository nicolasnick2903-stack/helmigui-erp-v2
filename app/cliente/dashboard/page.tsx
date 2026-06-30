'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ─── tipos ─────────────────────────────────────────────── */
type Perfil = { id: string; nome: string; razaoSocial: string }

type Nota = {
  id: string; valor: number; vencimento: string | null
  status: 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA'
  fluxo: 'ENTRADA' | 'SAIDA'; categoria: string | null
  emitente: string | null; numero: string | null; criadoEm: string
}

type DadosNota = {
  numero: string; emitente: string; valor: string; vencimento: string
  dataEmissao: string; categoria: string; outrosDescricao: string
  fluxo: string; observacoes: string; codigoBarras: string
}

const DADOS_VAZIOS: DadosNota = {
  numero: '', emitente: '', valor: '', vencimento: '', dataEmissao: '',
  categoria: 'servico', outrosDescricao: '', fluxo: 'SAIDA', observacoes: '', codigoBarras: '',
}

/* ─── helpers ───────────────────────────────────────────── */
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const isAtrasada = (n: Nota) => n.status === 'PENDENTE' && !!n.vencimento && new Date(n.vencimento) < new Date()

const STATUS_COR: Record<string, string> = {
  PAGA:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDENTE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ATRASADA: 'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELADA:'bg-white/10 text-white/30 border-white/10',
}

/* Parseia boleto bancário (linha digitável 47 dígitos) */
function parseBoleto(raw: string): Partial<DadosNota> {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 47 && d.length !== 48) return {}
  const fator = parseInt(d.substring(33, 37))
  const valorInt = parseInt(d.substring(37, 47))
  if (isNaN(fator) || isNaN(valorInt)) return {}
  const valor = (valorInt / 100).toFixed(2)
  let vencimento = ''
  if (fator > 0) {
    const base = new Date('1997-10-07')
    base.setDate(base.getDate() + fator)
    vencimento = base.toISOString().split('T')[0]
  }
  return { valor, vencimento, codigoBarras: raw }
}

/* Parseia chave NF-e (44 dígitos) ou URL com chave */
function parseNFe(raw: string): Partial<DadosNota> {
  const chave = raw.replace(/\D/g, '').slice(-44)
  if (chave.length !== 44) return {}
  // Posição 20-27: AAAAMMDD
  const ano = chave.substring(20, 22)
  const mes = chave.substring(22, 24)
  const dia = chave.substring(24, 26)
  const dataEmissao = `20${ano}-${mes}-${dia}`
  return { dataEmissao, codigoBarras: raw }
}

function extrairCodigo(texto: string): Partial<DadosNota> {
  const d = texto.replace(/\D/g, '')
  if (d.length === 47 || d.length === 48) return parseBoleto(texto)
  if (d.length === 44 || texto.startsWith('http')) return parseNFe(texto)
  return { codigoBarras: texto }
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function ClienteDashboard() {
  const router = useRouter()
  const [perfil,  setPerfil]  = useState<Perfil | null>(null)
  const [notas,   setNotas]   = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)

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

  function onNotaSalva(nova: Nota) {
    const n = isAtrasada(nova) ? { ...nova, status: 'ATRASADA' as const } : nova
    setNotas(prev => [n, ...prev])
    setModal(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const totalEntrada = notas.filter(n => n.fluxo === 'ENTRADA').reduce((s, n) => s + n.valor, 0)
  const totalSaida   = notas.filter(n => n.fluxo === 'SAIDA').reduce((s, n) => s + n.valor, 0)
  const lucro        = totalEntrada - totalSaida
  const atrasadas    = notas.filter(n => n.status === 'ATRASADA').length

  if (loading) return (
    <div className="min-h-screen bg-[#0d3d2a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-ouro border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d3d2a]">
      {/* Header */}
      <header className="bg-[#0a2e1f] border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-ouro rounded-xl flex items-center justify-center">
            <span className="text-[#0d3d2a] font-black text-lg">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">Helmigui ERP</p>
            <p className="text-white/40 text-xs">{perfil?.razaoSocial}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModal(true)}
            className="bg-ouro text-[#0d3d2a] font-bold text-sm px-4 py-2 rounded-xl hover:bg-ouro/90 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Lançar Nota
          </button>
          <button onClick={logout} className="text-white/40 hover:text-white text-sm hidden sm:block">Sair →</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card label="Receitas"  value={fmt(totalEntrada)} cor="text-emerald-400" bg="bg-emerald-500/20" />
          <Card label="Despesas"  value={fmt(totalSaida)}   cor="text-red-400"     bg="bg-red-500/20" />
          <Card label="Lucro"     value={fmt(lucro)}         cor={lucro >= 0 ? 'text-ouro' : 'text-red-400'} bg="bg-ouro/20" />
          <Card label="Atrasadas" value={String(atrasadas)}  cor={atrasadas > 0 ? 'text-red-400' : 'text-white/40'} bg="bg-red-500/20" />
        </div>

        {/* Lista de notas */}
        <div className="bg-[#0a2e1f]/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-bold">Minhas Notas Fiscais</h2>
            <span className="text-white/30 text-sm">{notas.length} nota(s)</span>
          </div>
          {notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-white/40 text-sm">Nenhuma nota lançada ainda</p>
              <button onClick={() => setModal(true)} className="text-ouro text-sm hover:underline">Lançar primeira nota →</button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notas.map(nota => (
                <div key={nota.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${nota.fluxo === 'ENTRADA' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={nota.fluxo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}>
                      {nota.fluxo === 'ENTRADA'
                        ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                        : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{nota.emitente || nota.categoria || 'Nota Fiscal'}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-white/40 text-xs">{nota.categoria}</span>
                      {nota.vencimento && <span className={`text-xs ${nota.status === 'ATRASADA' ? 'text-red-400' : 'text-white/30'}`}>Vence: {fmtDate(nota.vencimento)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-bold text-sm ${nota.fluxo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {nota.fluxo === 'SAIDA' ? '− ' : '+ '}{fmt(nota.valor)}
                    </span>
                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${STATUS_COR[nota.status]}`}>
                      {nota.status === 'PAGA' ? 'Paga' : nota.status === 'PENDENTE' ? 'Pendente' : nota.status === 'ATRASADA' ? 'Atrasada' : 'Cancelada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal 3 passos */}
      {modal && (
        <ModalLancarNota onClose={() => setModal(false)} onSalva={onNotaSalva} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MODAL 3 PASSOS
═══════════════════════════════════════════════════════════ */
function ModalLancarNota({ onClose, onSalva }: { onClose: () => void; onSalva: (n: Nota) => void }) {
  const [passo,  setPasso]  = useState<1 | 2 | 3>(1)
  const [dados,  setDados]  = useState<DadosNota>(DADOS_VAZIOS)
  const [foto,   setFoto]   = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0a2e1f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[96vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Lançar Nota Fiscal</h3>
            {/* Indicador de passos */}
            <div className="flex items-center gap-2 mt-2">
              {([1,2,3] as const).map(p => (
                <div key={p} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    p < passo ? 'bg-emerald-500 text-white' : p === passo ? 'bg-ouro text-[#0d3d2a]' : 'bg-white/10 text-white/30'
                  }`}>
                    {p < passo ? '✓' : p}
                  </div>
                  <span className={`text-xs ${p === passo ? 'text-white' : 'text-white/30'}`}>
                    {p === 1 ? 'Código' : p === 2 ? 'Foto' : 'Dados'}
                  </span>
                  {p < 3 && <div className={`w-5 h-px ${p < passo ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl mt-[-20px]">✕</button>
        </div>

        {/* Conteúdo por passo */}
        <div className="flex-1 overflow-y-auto">
          {passo === 1 && (
            <PassoScanner
              onDetectado={(texto) => {
                const extraido = extrairCodigo(texto)
                setDados(prev => ({ ...prev, ...extraido, codigoBarras: texto }))
                setPasso(2)
              }}
            />
          )}
          {passo === 2 && (
            <PassoFoto
              onFoto={(dataUrl) => { setFoto(dataUrl); setPasso(3) }}
              onVoltar={() => setPasso(1)}
            />
          )}
          {passo === 3 && (
            <PassoForm
              dados={dados}
              foto={foto}
              onChange={(k, v) => setDados(prev => ({ ...prev, [k]: v }))}
              onVoltar={() => setPasso(2)}
              onSalva={onSalva}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── PASSO 1: Scanner de código de barras ────────────────── */
function PassoScanner({ onDetectado }: { onDetectado: (texto: string) => void }) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [status,    setStatus]    = useState<'idle' | 'scanning' | 'ok' | 'error'>('idle')
  const [manual,    setManual]    = useState('')
  const [showManual, setShowManual] = useState(false)

  const iniciar = useCallback(async () => {
    if (!videoRef.current) return
    setStatus('scanning')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          setStatus('ok')
          controls?.stop()
          onDetectado(result.getText())
        }
        if (err && !(err as Error).message?.includes('No MultiFormat')) {
          console.warn(err)
        }
      })
      controlsRef.current = controls
    } catch {
      setStatus('error')
    }
  }, [onDetectado])

  useEffect(() => {
    iniciar()
    return () => { controlsRef.current?.stop() }
  }, [iniciar])

  return (
    <div className="p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-white font-medium">Aponte a câmera para o código de barras</p>
        <p className="text-white/40 text-sm">Boleto, NF-e ou QR Code</p>
      </div>

      {/* Viewfinder */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay de scan */}
        {status === 'scanning' && (
          <>
            {/* Cantos do frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-32">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-ouro rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-ouro rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-ouro rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-ouro rounded-br" />
                {/* Linha de scan animada */}
                <div className="absolute left-0 right-0 h-0.5 bg-ouro/80 animate-[scan_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
              </div>
            </div>
            <div className="absolute bottom-3 inset-x-0 text-center">
              <span className="bg-black/60 text-white/70 text-xs px-3 py-1.5 rounded-full">Buscando código...</span>
            </div>
          </>
        )}

        {status === 'ok' && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <div className="bg-emerald-500 rounded-full w-16 h-16 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center p-4">
              <p className="text-red-400 text-sm mb-2">Câmera não disponível</p>
              <button onClick={iniciar} className="text-ouro text-sm underline">Tentar novamente</button>
            </div>
          </div>
        )}
      </div>

      {/* Input manual */}
      {!showManual ? (
        <button
          onClick={() => setShowManual(true)}
          className="w-full text-white/40 text-sm hover:text-white/70 py-2 transition-colors"
        >
          Digitar código manualmente →
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-white/50 text-xs">CÓDIGO DE BARRAS OU CHAVE NF-E</p>
          <input
            value={manual}
            onChange={e => setManual(e.target.value)}
            placeholder="Cole ou digite o código aqui..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 font-mono"
          />
          <button
            onClick={() => { if (manual.trim()) onDetectado(manual.trim()) }}
            disabled={!manual.trim()}
            className="w-full bg-ouro text-[#0d3d2a] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
          >
            Usar este código →
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── PASSO 2: Tirar foto da nota ────────────────────────── */
function PassoFoto({ onFoto, onVoltar }: { onFoto: (url: string) => void; onVoltar: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [camErr,   setCamErr]   = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCamErr(true))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  function tirarFoto() {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    const url = c.toDataURL('image/jpeg', 0.85)
    setPreview(url)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function repetir() {
    setPreview(null)
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
  }

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <p className="text-white font-medium">Tire uma foto da nota fiscal</p>
        <p className="text-white/40 text-sm">Etapa obrigatória para registrar o documento</p>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        {!preview ? (
          <>
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${camErr ? 'hidden' : ''}`} />
            {camErr && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                <p className="text-white/50 text-sm">Câmera indisponível</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-ouro text-[#0d3d2a] font-bold text-sm px-5 py-2.5 rounded-xl"
                >
                  Selecionar foto da galeria
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onArquivo} />
              </div>
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="foto" className="w-full h-full object-contain bg-black" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!preview ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onVoltar} className="border border-white/20 text-white/60 rounded-xl py-3 text-sm hover:bg-white/5">
            ← Voltar
          </button>
          <button
            onClick={tirarFoto}
            disabled={camErr}
            className="bg-ouro text-[#0d3d2a] font-bold rounded-xl py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Tirar foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={repetir} className="border border-white/20 text-white/60 rounded-xl py-3 text-sm hover:bg-white/5">
            Repetir foto
          </button>
          <button
            onClick={() => onFoto(preview)}
            className="bg-ouro text-[#0d3d2a] font-bold rounded-xl py-3 text-sm"
          >
            Usar esta foto →
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── PASSO 3: Confirmar e salvar dados ──────────────────── */
function PassoForm({
  dados, foto, onChange, onVoltar, onSalva,
}: {
  dados: DadosNota; foto: string | null
  onChange: (k: keyof DadosNota, v: string) => void
  onVoltar: () => void
  onSalva: (n: Nota) => void
}) {
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState('')

  async function salvar() {
    if (!dados.valor) { setErro('Informe o valor da nota'); return }
    setSaving(true); setErro('')
    const cat = dados.categoria === 'outros' ? dados.outrosDescricao || 'Outros' : dados.categoria
    const res = await fetch('/api/cliente/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor:       parseFloat(dados.valor) || 0,
        vencimento:  dados.vencimento  || undefined,
        dataEmissao: dados.dataEmissao || undefined,
        categoria:   cat,
        emitente:    dados.emitente    || undefined,
        numero:      dados.numero      || undefined,
        fluxo:       dados.fluxo,
        observacoes: dados.observacoes || undefined,
        status:      'PENDENTE',
      }),
    })
    if (res.ok) {
      onSalva(await res.json())
    } else {
      const d = await res.json()
      setErro(d.error || 'Erro ao salvar')
      setSaving(false)
    }
  }

  const Input = ({ label, k, placeholder, type = 'text' }: { label: string; k: keyof DadosNota; placeholder?: string; type?: string }) => (
    <div>
      <label className="text-white/50 text-xs block mb-1.5">{label}</label>
      <input
        type={type}
        value={dados[k]}
        onChange={e => onChange(k, e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50 ${type === 'date' ? '[color-scheme:dark]' : ''}`}
      />
    </div>
  )

  return (
    <div className="p-5 space-y-4 pb-2">
      {/* Thumbnail da foto */}
      {foto && (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="nota" className="w-14 h-10 object-cover rounded-lg" />
          <div>
            <p className="text-white text-sm font-medium">Foto da nota anexada</p>
            <p className="text-white/40 text-xs">Clique em &quot;Voltar&quot; para refazer</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 ml-auto flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}

      {/* Código detectado */}
      {dados.codigoBarras && (
        <div className="bg-ouro/10 border border-ouro/30 rounded-xl px-4 py-2.5">
          <p className="text-ouro text-xs font-medium mb-0.5">Código lido com sucesso</p>
          <p className="text-white/50 text-xs font-mono truncate">{dados.codigoBarras}</p>
        </div>
      )}

      {erro && <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">{erro}</div>}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Número" k="numero" placeholder="001" />
        <Input label="Valor (R$) *" k="valor" placeholder="0,00" type="number" />
      </div>

      <Input label="Emitente" k="emitente" placeholder="Quem emitiu a nota" />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Emissão" k="dataEmissao" type="date" />
        <Input label="Vencimento" k="vencimento" type="date" />
      </div>

      {/* Categoria */}
      <div>
        <label className="text-white/50 text-xs block mb-2">CATEGORIA</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ val:'servico', icon:'🔧', label:'Serviço' }, { val:'imposto', icon:'🏛️', label:'Imposto' }, { val:'outros', icon:'📋', label:'Outros' }].map(op => (
            <button key={op.val} onClick={() => onChange('categoria', op.val)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all ${dados.categoria === op.val ? 'bg-ouro/20 border-ouro/50 text-ouro font-medium' : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'}`}>
              <span className="text-base">{op.icon}</span><span>{op.label}</span>
            </button>
          ))}
        </div>
        {dados.categoria === 'outros' && (
          <input value={dados.outrosDescricao} onChange={e => onChange('outrosDescricao', e.target.value)}
            placeholder="Descreva o tipo de gasto..."
            autoFocus
            className="mt-2 w-full bg-white/10 border border-ouro/30 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-ouro/50" />
        )}
      </div>

      {/* Tipo */}
      <div>
        <label className="text-white/50 text-xs block mb-2">TIPO</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ val:'SAIDA', label:'Despesa', desc:'Paguei/Gasto', cor:'border-red-500/50 bg-red-500/10 text-red-400' },
            { val:'ENTRADA', label:'Receita', desc:'Recebi/Entrada', cor:'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' }].map(op => (
            <button key={op.val} onClick={() => onChange('fluxo', op.val)}
              className={`py-2.5 rounded-xl border text-sm transition-all ${dados.fluxo === op.val ? op.cor + ' font-medium' : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'}`}>
              <p className="font-medium">{op.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{op.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2 border-t border-white/10 mt-2">
        <button onClick={onVoltar} className="flex-1 border border-white/20 text-white/60 rounded-xl py-3 text-sm hover:bg-white/5">
          ← Voltar
        </button>
        <button onClick={salvar} disabled={saving} className="flex-1 bg-ouro text-[#0d3d2a] font-bold rounded-xl py-3 text-sm disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Nota'}
        </button>
      </div>
    </div>
  )
}

/* ─── Card financeiro ─────────────────────────────────────── */
function Card({ label, value, cor, bg }: { label: string; value: string; cor: string; bg: string }) {
  return (
    <div className="bg-[#0a2e1f]/80 border border-white/10 rounded-2xl p-4">
      <div className={`w-2 h-2 rounded-full mb-3 ${bg.replace('/20', '')}`} />
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg leading-tight ${cor}`}>{value}</p>
    </div>
  )
}
