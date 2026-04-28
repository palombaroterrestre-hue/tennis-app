import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function GET() {
  const msg = `🎾 <b>TEST NOTIFICATION!</b>\nTennis App is working!\n⏱️ ${new Date().toLocaleTimeString()}`
  const result = await sendTelegramMessage(msg)
  return NextResponse.json({ sent: result, time: new Date().toISOString() })
}