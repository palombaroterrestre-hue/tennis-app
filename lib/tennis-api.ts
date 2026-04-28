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
    'https://www.flashscore.com/tennis/live/',
    'https://www.sofascore.com/tennis/live',
  ]
  
  let lastError = ''
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        return res.text()
      }
      lastError = `${res.status}`
    } catch (e) {
      lastError = String(e)
    }
  }
  throw new Error(`All sources blocked: ${lastError}`)
}

function parseMatches(html: string): TennisMatch[] {
  const $ = cheerio.load(html)
  const matches: TennisMatch[] = []

  $('[data-event-type="match"]').each((_, el) => {
    const eventId = $(el).attr('data-id') || ''
    const homePlayer = $(el).find('[data-side="home"] .participant-name, [data-side="home"]').first().text().trim()
    const awayPlayer = $(el).find('[data-side="away"] .participant-name, [data-side="away"]').first().text().trim()
    const homeScore = parseInt($(el).find('[data-side="home"] .score').text()) || 0
    const awayScore = parseInt($(el).find('[data-side="away"] .score').text()) || 0
    const status = $(el).find('.time, .status').first().text().trim()
    const time = $(el).find('.time, .time').first().text().trim()
    const competition = $(el).closest('.sportName, .category').find('.name, .sportName').first().text().trim() || 'Tennis'

    if (!homePlayer || !awayPlayer) return

    matches.push({
      id: eventId,
      homePlayer,
      awayPlayer,
      homeScore,
      awayScore,
      competition,
      status,
      time,
    })
  })

  return matches
}

function formatScoreUpdate(match: TennisMatch): string {
  return `🎾 <b>SCORE UPDATE!</b>\n${match.competition}\n${match.homePlayer} ${match.homeScore} - ${match.awayScore} ${match.awayPlayer}\n⏱️ ${match.status}`
}

function formatMatchEnded(match: TennisMatch): string {
  return `🏁 <b>PARTITA TERMINATA!</b>\n${match.competition}\n${match.homePlayer} ${match.homeScore} - ${match.awayScore} ${match.awayPlayer}`
}

function processMatches(matches: TennisMatch[]): void {
  for (const match of matches) {
    const prev = seenMatches.get(match.id)

    if (!prev) {
      seenMatches.set(match.id, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
      })
      continue
    }

    const scoreChanged = match.homeScore !== prev.homeScore || match.awayScore !== prev.awayScore
    const isEnded = 
      match.status.toLowerCase().includes('ft') ||
      match.status.toLowerCase().includes('finished') ||
      match.status.toLowerCase().includes('terminato') ||
      match.status.toLowerCase().includes('completed')

    if (scoreChanged && !isEnded) {
      console.log('Score changed:', match.homePlayer, match.homeScore, '-', match.awayScore, match.awayPlayer)
      sendTelegramMessage(formatScoreUpdate(match))
    } else if (isEnded) {
      const wasNotEnded = 
        !prev.status.toLowerCase().includes('ft') &&
        !prev.status.toLowerCase().includes('finished') &&
        !prev.status.toLowerCase().includes('terminato')
      
      if (wasNotEnded) {
        console.log('Match ended:', match.homePlayer, match.awayPlayer)
        sendTelegramMessage(formatMatchEnded(match))
      }
    }

    seenMatches.set(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
    })
  }
}

export async function checkTennisMatches(useMock: boolean = false): Promise<TennisMatch[]> {
  try {
    let matches: TennisMatch[]

    if (useMock) {
      console.log('Using mock data for testing')
      matches = mockMatches
    } else {
      const html = await fetchPage()
      matches = parseMatches(html)

      if (matches.length === 0) {
        console.log('No matches returned')
      }
    }

    processMatches(matches)
    return matches
  } catch (error) {
    console.error('Error checking tennis matches:', error)
    sendTelegramMessage(`❌ Error: ${error}`)
    return []
  }
}

export async function getLiveTennisMatches(useMock: boolean = false): Promise<TennisMatch[]> {
  try {
    if (useMock) {
      return mockMatches
    }
    const html = await fetchPage()
    return parseMatches(html)
  } catch {
    return []
  }
}