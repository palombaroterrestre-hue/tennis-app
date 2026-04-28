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
    'https://www.wtatennis.com/scores/live',
    'https://www.tennisscore.com/live',
    'https://www.flashscore.com/tennis/live/',
  ]
  
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
      matches = mockMatches
    } else {
      matches = await getLiveTennisMatches()
    }

    processMatches(matches)
    return matches
  } catch (error) {
    console.error('Error:', error)
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