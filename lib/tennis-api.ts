import * as cheerio from 'cheerio'
import { sendTelegramMessage } from './telegram'

export interface TennisMatch {
  id: string
  homePlayer: string
  awayPlayer: string
  homeScore: number
  awayScore: number
  competition: string
  status: string
  time: string
}

const seenMatches = new Map<string, { homeScore: number; awayScore: number; status: string }>()

const mockMatches = [
  {
    id: 'mock1',
    homePlayer: 'Djokovic',
    awayPlayer: 'Alcaraz',
    homeScore: 2,
    awayScore: 1,
    competition: 'ATP',
    status: 'SET 3',
    time: 'Set 3'
  },
  {
    id: 'mock2',
    homePlayer: 'Sinner',
    awayPlayer: 'Medvedev',
    homeScore: 1,
    awayScore: 2,
    competition: 'ATP',
    status: 'SET 2',
    time: 'Set 2'
  },
  {
    id: 'mock3',
    homePlayer: 'Swiatek',
    awayPlayer: 'Gauff',
    homeScore: 2,
    awayScore: 0,
    competition: 'WTA',
    status: 'FT',
    time: 'Finished'
  }
]

async function fetchPage(): Promise<string> {
  const urls = [
    'https://www.atptour.com/en/scores/current',
    'https://api.allorigins.win/raw?url=https://www.atptour.com/en/scores/current',
  ]
  
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) return res.text()
    } catch { continue }
  }
  throw new Error('All sources failed')
}

function parseMatches(html: string): TennisMatch[] {
  const $ = cheerio.load(html)
  const matches: TennisMatch[] = []

  // ATP Tour structure
  $('.event-table tbody tr').each((_, el) => {
    const eventId = $(el).attr('id') || String(Math.random())
    const homePlayer = $(el).find('.team-left .player-name').text().trim()
    const awayPlayer = $(el).find('.team-right .player-name').text().trim()
    const scoreText = $(el).find('.score-board').text()
    const status = $(el).find('.time-slot').text().trim()

    if (!homePlayer || !awayPlayer) return

    // Parse score like "6-4 6-3" or "6-4 3-6 6-3"
    const homeScore = (scoreText.match(/\d+(?=-\d)/g) || []).length
    const awayScore = (scoreText.match(/(?<=-)\d+/g) || []).length

    matches.push({
      id: eventId,
      homePlayer,
      awayPlayer,
      homeScore: homeScore + awayScore > 0 ? homeScore : 0,
      awayScore: homeScore + awayScore > 0 ? awayScore : 0,
      competition: 'ATP',
      status: status || 'LIVE',
      time: status || '',
    })
  })

  // Fallback: general match finder
  if (matches.length === 0) {
    $('[class*="match"], [class*="event"]').each((_, el) => {
      const eventId = $(el).attr('id') || String(Math.random())
      const homePlayer = $(el).find('[class*="home"], [class*="team1"]').first().text().trim()
      const awayPlayer = $(el).find('[class*="away"], [class*="team2"]').first().text().trim()

      if (homePlayer && awayPlayer && homePlayer.length > 1 && awayPlayer.length > 1) {
        matches.push({
          id: eventId,
          homePlayer,
          awayPlayer,
          homeScore: 0,
          awayScore: 0,
          competition: 'ATP',
          status: 'LIVE',
          time: '',
        })
      }
    })
  }

  return matches
}

function formatAllMatches(matches: TennisMatch[]): string {
  if (matches.length === 0) return ''
  
  let msg = `🎾 <b>LIVE TENNIS (${matches.length})</b>\n\n`
  
  for (const m of matches.slice(0, 10)) {
    msg += `${m.homePlayer} ${m.homeScore} - ${m.awayScore} ${m.awayPlayer}\n`
    msg += `   ${m.status} ${m.time}\n\n`
  }
  
  return msg.trim()
}

const firstCheck = new Set<string>()

function processMatches(matches: TennisMatch[]): void {
  for (const match of matches) {
    const prev = seenMatches.get(match.id)

    if (!prev) {
      seenMatches.set(match.id, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
      })
      firstCheck.add(match.id)
      continue
    }

    const scoreChanged = match.homeScore !== prev.homeScore || match.awayScore !== prev.awayScore
    const isEnded = 
      match.status.toLowerCase().includes('ft') ||
      match.status.toLowerCase().includes('finished') ||
      match.status.toLowerCase().includes('terminato') ||
      match.status.toLowerCase().includes('completed')

    if (scoreChanged && !isEnded) {
      sendTelegramMessage(`🎾 <b>SCORE UPDATE!</b>\n${match.homePlayer} ${match.homeScore} - ${match.awayScore} ${match.awayPlayer}\n⏱️ ${match.status}`)
    } else if (isEnded) {
      const wasNotEnded = 
        !prev.status.toLowerCase().includes('ft') &&
        !prev.status.toLowerCase().includes('finished') &&
        !prev.status.toLowerCase().includes('terminato')
      
      if (wasNotEnded) {
        sendTelegramMessage(`🏁 <b>PARTITA TERMINATA!</b>\n${match.homePlayer} ${match.homeScore} - ${match.awayScore} ${match.awayPlayer}`)
      }
    }

    seenMatches.set(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
    })
  }

  // Send all live matches on first check
  if (firstCheck.size > 0 && matches.length > 0) {
    const msg = formatAllMatches(matches)
    if (msg) {
      sendTelegramMessage(msg)
      firstCheck.clear()
    }
  }
}

export async function checkTennisMatches(useMock: boolean = false, sendAllMatches: boolean = false): Promise<TennisMatch[]> {
  try {
    let matches: TennisMatch[]

    if (useMock) {
      matches = mockMatches
    } else {
      matches = await getLiveTennisMatches()
    }

    if (sendAllMatches && matches.length > 0) {
      const msg = formatAllMatches(matches)
      if (msg) sendTelegramMessage(msg)
    } else {
      processMatches(matches)
    }
    
    return matches
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}

export async function getLiveTennisMatches(useMock: boolean = false): Promise<TennisMatch[]> {
  if (useMock) {
    return mockMatches
  }
  try {
    const html = await fetchPage()
    return parseMatches(html)
  } catch (e) {
    console.log('Fetch error:', e)
    return []
  }
}

export async function getErrorLog(): Promise<string> {
  return 'Check server logs'
}