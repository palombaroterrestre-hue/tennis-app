import { NextResponse } from 'next/server'
import { checkTennisMatches } from '@/lib/tennis-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mock = searchParams.get('mock') === 'true'
    await checkTennisMatches(mock)
    return NextResponse.json({ status: 'ok', message: 'Checked tennis matches' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}