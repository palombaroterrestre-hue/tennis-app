const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('Telegram disabled - missing token/chat_id')
    return false
  }
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch (e) {
    console.log('Telegram error:', e)
    return false
  }
}

export function formatMatchEnded(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  competition: string
): string {
  return `🎾 <b>PARTITA TERMINATA!</b>\n${competition}\n${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`
}