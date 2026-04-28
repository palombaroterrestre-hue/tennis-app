import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Tennis App',
    status: 'running',
    endpoints: {
      matches: '/api/matches',
      check: '/api/check?mock=true',
      debug: '/api/debug'
    }
  })
}