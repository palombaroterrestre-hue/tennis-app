import { NextResponse } from 'next/server'

export async function GET() {
  const urls = [
    { name: 'ESPN', url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/teams/55/schedule' },
    { name: 'allorigins', url: 'https://api.allorigins.win/raw?url=https://www.atptour.com/en/scores/current' },
    { name: 'ATP', url: 'https://www.atptour.com/en/scores/current' },
    { name: 'flashscore', url: 'https://www.flashscore.com/tennis/live/' },
  ]
  
  const results = []
  
  for (const { name, url } of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        },
        signal: AbortSignal.timeout(10000),
      })
      results.push({ name, status: res.status, ok: res.ok, size: (await res.text()).length })
    } catch (e) {
      results.push({ name, error: String(e) })
    }
  }
  
  return NextResponse.json(results)
}