import type { Card, EnemyCard, JesterCard, Suit, NumberRank, FaceRank } from '../types'
import { SUITS, NUMBER_RANKS, RANK_VALUES, ENEMY_STATS, JESTER_COUNTS } from '../types'

let cardIdCounter = 0

export function resetCardIdCounter(): void {
  cardIdCounter = Date.now()
}

function nextCardId(prefix: string): string {
  return `${prefix}-${++cardIdCounter}`
}

/**
 * Fisher-Yates shuffle (in-place, returns same array)
 */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Create the 52-card Tavern deck (A-10 of each suit), shuffled.
 */
export function createTavernDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of NUMBER_RANKS) {
      cards.push({
        id: nextCardId('tavern'),
        suit,
        rank,
        value: RANK_VALUES[rank],
      })
    }
  }
  return shuffle(cards)
}

/**
 * Create Jester cards based on player count.
 */
export function createJesters(playerCount: number): JesterCard[] {
  const count = JESTER_COUNTS[playerCount] ?? 0
  const jesters: JesterCard[] = []
  for (let i = 0; i < count; i++) {
    jesters.push({ id: nextCardId('jester'), rank: 'Jester' })
  }
  return jesters
}

/**
 * Create an enemy card.
 */
export function createEnemyCard(suit: Suit, rank: FaceRank): EnemyCard {
  const stats = ENEMY_STATS[rank]
  return {
    id: nextCardId('enemy'),
    suit,
    rank,
    maxHealth: stats.health,
    health: stats.health,
    baseAttack: stats.attack,
    attack: stats.attack,
  }
}

/**
 * Create the Castle deck: Jacks on top, Queens in middle, Kings on bottom.
 * Suits are shuffled within each tier.
 */
export function createCastleDeck(): EnemyCard[] {
  const jacks = shuffle(SUITS.map(s => createEnemyCard(s, 'J')))
  const queens = shuffle(SUITS.map(s => createEnemyCard(s, 'Q')))
  const kings = shuffle(SUITS.map(s => createEnemyCard(s, 'K')))

  // Stack: kings at bottom, queens in middle, jacks on top
  // Array index 0 = top of deck (first to be drawn)
  return [...jacks, ...queens, ...kings]
}

/**
 * Deal cards from the tavern deck to a player hand.
 * Returns [dealtCards, remainingDeck].
 */
export function dealCards(
  deck: Card[],
  count: number
): [Card[], Card[]] {
  const dealt = deck.slice(0, count)
  const remaining = deck.slice(count)
  return [dealt, remaining]
}

/**
 * Draw a specific number of cards from the tavern deck.
 * Returns [drawnCards, remainingDeck].
 */
export function drawCards(
  deck: Card[],
  count: number
): [Card[], Card[]] {
  const actual = Math.min(count, deck.length)
  const drawn = deck.slice(0, actual)
  const remaining = deck.slice(actual)
  return [drawn, remaining]
}
