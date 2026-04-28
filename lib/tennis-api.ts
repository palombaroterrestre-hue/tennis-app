import * as cheerio from 'cheerio'
import { sendTelegramMessage, formatMatchEnded } from './telegram'

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
const FLASHSCORE_TENNIS_URL = 'https://www.flashscore.it/tennis/diretta/'

async function fetchPage(): Promise<string> {
  const res = await fetch(FLASHSCORE_TENNIS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'it-IT,it;q=0.9',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(15000),
  })
  return res.text()
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

export async function checkTennisMatches(): Promise<TennisMatch[]> {
  try {
    const html = await fetchPage()
    const matches = parseMatches(html)

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

      const isEnded = 
        match.status.toLowerCase().includes('ft') ||
        match.status.toLowerCase().includes('finished') ||
        match.status.toLowerCase().includes('terminato') ||
        match.status.toLowerCase().includes('completed')

      const wasNotEnded = 
        !prev.status.toLowerCase().includes('ft') &&
        !prev.status.toLowerCase().includes('finished') &&
        !prev.status.toLowerCase().includes('terminato')

      if (isEnded && wasNotEnded) {
        const msg = formatMatchEnded(
          match.homePlayer,
          match.awayPlayer,
          match.homeScore,
          match.awayScore,
          match.competition
        )
        console.log('Match ended:', msg)
        await sendTelegramMessage(msg)
      }

      seenMatches.set(match.id, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
      })
    }

    return matches
  } catch (error) {
    console.error('Error checking tennis matches:', error)
    return []
  }
}

export async function getLiveTennisMatches(): Promise<TennisMatch[]> {
  try {
    const html = await fetchPage()
    return parseMatches(html)
  } catch {
    return []
  }
}