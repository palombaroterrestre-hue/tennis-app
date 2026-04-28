import { NextResponse } from 'next/server'
import { getLiveTennisMatches } from '@/lib/tennis-api'

export async function GET() {
  const matches = await getLiveTennisMatches()
  return NextResponse.json({
    status: 'ok',
    matches
  })
}