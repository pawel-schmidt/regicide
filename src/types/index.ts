// === Card Types ===

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export type NumberRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
export type FaceRank = 'J' | 'Q' | 'K'
export type JesterRank = 'Jester'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  /** Numeric attack value: A=1, 2-10 face value, J=10, Q=15, K=20 (captured) */
  value: number
  /** Whether this card is a captured enemy */
  captured?: boolean
}

export interface EnemyCard {
  id: string
  suit: Suit
  rank: FaceRank
  /** Max health: J=20, Q=30, K=40 */
  maxHealth: number
  /** Current health */
  health: number
  /** Base attack: J=10, Q=15, K=20 */
  baseAttack: number
  /** Current attack after shield reductions */
  attack: number
}

export interface JesterCard {
  id: string
  rank: JesterRank
}

export type AnyCard = Card | EnemyCard | JesterCard

// === Game State Types ===

export type GamePhase = 'setup' | 'playing' | 'won' | 'lost'

export type TurnStep =
  | 'play_cards'     // Step 1: Player chooses cards to play (or yield)
  | 'activate_power' // Step 2: Suit power activates (auto or needs input)
  | 'deal_damage'    // Step 3: Apply damage to enemy
  | 'suffer_damage'  // Step 4: Player discards to survive enemy attack
  | 'enemy_defeated' // Transition: enemy defeated, reveal next

export interface PlayedCards {
  cards: Card[]
  jester: JesterCard | null
  totalAttack: number
  suits: Suit[]
  isCombo: boolean
}

export interface LogEntry {
  id: number
  message: string
  type: 'action' | 'damage' | 'heal' | 'draw' | 'shield' | 'enemy' | 'system'
  timestamp: number
}

export interface GameState {
  phase: GamePhase
  turnStep: TurnStep
  playerCount: number

  // Decks
  castleDeck: EnemyCard[]
  tavernDeck: Card[]
  discardPile: Card[]

  // Current
  currentEnemy: EnemyCard | null
  playerHand: Card[]
  jesterHand: JesterCard[]

  // Turn state
  currentPlay: PlayedCards | null
  shieldTotal: number // accumulated shield for current enemy
  immunityBroken: boolean // jester broke immunity this turn

  // Log
  log: LogEntry[]
  logCounter: number

  // Hearts healing selection state
  heartsHealAmount: number
}

// === Constants ===

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

export const NUMBER_RANKS: NumberRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 15, 'K': 20,
}

export const ENEMY_STATS: Record<FaceRank, { health: number; attack: number }> = {
  'J': { health: 20, attack: 10 },
  'Q': { health: 30, attack: 15 },
  'K': { health: 40, attack: 20 },
}

export const HAND_SIZES: Record<number, number> = {
  1: 8, 2: 7, 3: 6, 4: 5,
}

export const JESTER_COUNTS: Record<number, number> = {
  1: 0, 2: 0, 3: 1, 4: 2,
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
}
