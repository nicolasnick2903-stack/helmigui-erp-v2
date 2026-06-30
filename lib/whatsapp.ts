export async function notificarWhatsApp(mensagem: string): Promise<void> {
  const apiKey = process.env.CALLMEBOT_API_KEY
  const phone  = process.env.WHATSAPP_ADMIN_PHONE ?? '5511992144970'

  if (!apiKey) return // silencioso se não configurado

  try {
    const texto = encodeURIComponent(mensagem)
    const url   = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${texto}&apikey=${apiKey}`
    await fetch(url, { method: 'GET' })
  } catch {
    // falha silenciosa — não deve interromper o fluxo principal
  }
}
