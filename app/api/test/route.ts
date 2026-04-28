import { NextResponse } from 'next/server'
import { checkTennisMatches } from '@/lib/tennis-api'

export async function GET() {
  await checkTennisMatches(true)
  return NextResponse.json({ status: 'ok', message: 'Test with mock data complete' })
}