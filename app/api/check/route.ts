import { NextResponse } from 'next/server'
import { checkTennisMatches } from '@/lib/tennis-api'

export async function GET() {
  try {
    await checkTennisMatches()
    return NextResponse.json({ status: 'ok', message: 'Checked tennis matches' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}