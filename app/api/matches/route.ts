import { NextResponse } from 'next/server'
import { getLiveTennisMatches } from '@/lib/tennis-api'

export async function GET() {
  try {
    const matches = await getLiveTennisMatches()
    return NextResponse.json(matches)
  } catch {
    return NextResponse.json([])
  }
}