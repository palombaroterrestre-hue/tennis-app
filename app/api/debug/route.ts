import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  return NextResponse.json({
    hasToken: !!token,
    hasChatId: !!chatId,
    tokenPrefix: token?.substring(0, 10),
    chatId
  })
}