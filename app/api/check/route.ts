import { NextResponse } from 'next/server'
import { checkTennisMatches } from '@/lib/tennis-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mock = searchParams.get('mock') === 'true'
    const all = searchParams.get('all') === 'true'
    const matches = await checkTennisMatches(mock, all)
    return NextResponse.json({ status: 'ok', matchesCount: matches.length, mock, all })
  } catch (error) {
    const errorMsg = String(error)
    console.error('Check error:', errorMsg)
    return NextResponse.json({ status: 'error', error: errorMsg }, { status: 500 })
  }
}