import type { Card, EnemyCard, JesterCard, Suit, PlayedCards } from '../types'

// === Combo Validation ===

/**
 * Check if a set of cards forms a valid combo:
 * - All cards must have the same rank
 * - The sum of their values must be <= 10
 * - Single cards are always valid
 */
export function isValidCombo(cards: Card[]): boolean {
  if (cards.length === 0) return false
  if (cards.length === 1) return true

  const rank = cards[0].rank
  if (!cards.every(c => c.rank === rank)) return false

  const sum = cards.reduce((acc, c) => acc + c.value, 0)
  return sum <= 10
}

/**
 * Check if an Ace can be played as a companion with another card.
 * An Ace can be played with any single card for +1 damage and its suit power.
 */
export function isValidAceCompanion(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const aces = cards.filter(c => c.rank === 'A')
  const nonAces = cards.filter(c => c.rank !== 'A')

  // Exactly one ace and one non-ace
  if (aces.length === 1 && nonAces.length === 1) return true

  // Two aces together (sum = 2, <= 10, same rank) - handled by isValidCombo
  return false
}

/**
 * Validate a full play: either a valid combo, an ace companion play, or a single card.
 */
export function isValidPlay(cards: Card[], jester: JesterCard | null): boolean {
  // Jester can be played alone
  if (jester && cards.length === 0) return true

  // Jester cannot be combined with other cards
  if (jester && cards.length > 0) return false

  if (cards.length === 0) return false

  // Single card is always valid
  if (cards.length === 1) return true

  // Ace companion: one ace + one non-ace card
  if (isValidAceCompanion(cards)) return true

  // Multi-card combo: same rank, sum <= 10
  return isValidCombo(cards)
}

// === Attack Calculation ===

/**
 * Calculate the total attack value of played cards.
 * Clubs double the attack value.
 * Ace companion adds +1.
 */
export function calculateAttack(
  cards: Card[],
  _jester: JesterCard | null,
  enemy: EnemyCard,
  immunityBroken: boolean
): { totalAttack: number; suits: Suit[] } {
  if (cards.length === 0) {
    return { totalAttack: 0, suits: [] }
  }

  // Collect all unique suits
  const suits = [...new Set(cards.map(c => c.suit))]

  // Base attack: sum of card values
  let totalAttack = cards.reduce((acc, c) => acc + c.value, 0)

  // Check for clubs doubling
  const hasClubs = suits.includes('clubs')
  const clubsImmune = enemy.suit === 'clubs' && !immunityBroken

  if (hasClubs && !clubsImmune) {
    totalAttack *= 2
  }

  return { totalAttack, suits }
}

// === Suit Power Resolution ===

/**
 * Calculate how many cards Hearts can retrieve from the discard pile.
 * The heal amount equals the attack value of the played cards (before clubs doubling).
 */
export function calculateHeartsHeal(cards: Card[]): number {
  return cards.reduce((acc, c) => acc + c.value, 0)
}

/**
 * Calculate how many cards Diamonds lets the player draw.
 * The draw amount equals the attack value of the played cards (before clubs doubling).
 */
export function calculateDiamondsDraw(cards: Card[]): number {
  return cards.reduce((acc, c) => acc + c.value, 0)
}

/**
 * Calculate the shield value from Spades.
 * The shield amount equals the attack value of the played cards (before clubs doubling).
 */
export function calculateSpadesShield(cards: Card[]): number {
  return cards.reduce((acc, c) => acc + c.value, 0)
}

// === Immunity ===

/**
 * Check if the enemy is immune to a specific suit's power.
 * An enemy is immune to powers of its own suit.
 */
export function isImmuneToSuit(enemy: EnemyCard, suit: Suit, immunityBroken: boolean): boolean {
  if (immunityBroken) return false
  return enemy.suit === suit
}

/**
 * Get the active (non-immune) suits from a play.
 */
export function getActiveSuits(
  suits: Suit[],
  enemy: EnemyCard,
  immunityBroken: boolean
): Suit[] {
  return suits.filter(s => !isImmuneToSuit(enemy, s, immunityBroken))
}

// === Damage Resolution ===

/**
 * Apply damage to an enemy. Returns updated enemy.
 * - health <= 0: enemy defeated
 * - health === 0: exact kill (captured)
 */
export function applyDamage(enemy: EnemyCard, damage: number): EnemyCard {
  return {
    ...enemy,
    health: enemy.health - damage,
  }
}

/**
 * Check if the enemy is defeated (health <= 0).
 */
export function isEnemyDefeated(enemy: EnemyCard): boolean {
  return enemy.health <= 0
}

/**
 * Check if the enemy was captured (exact kill, health === 0).
 */
export function isExactKill(enemy: EnemyCard): boolean {
  return enemy.health === 0
}

// === Suffer Damage ===

/**
 * Calculate the current enemy attack (base attack minus accumulated shield).
 */
export function getEffectiveAttack(enemy: EnemyCard, shieldTotal: number): number {
  return Math.max(0, enemy.attack - shieldTotal)
}

/**
 * Validate that the player's discard selection covers the enemy's attack.
 * The total value of discarded cards must be >= enemy's effective attack.
 */
export function isValidDamageDiscard(
  discardedCards: Card[],
  requiredDamage: number
): boolean {
  if (requiredDamage <= 0) return true
  const total = discardedCards.reduce((acc, c) => acc + c.value, 0)
  return total >= requiredDamage
}

/**
 * Check if the player can survive the enemy attack
 * (has enough total card value in hand).
 */
export function canSurviveAttack(hand: Card[], requiredDamage: number): boolean {
  if (requiredDamage <= 0) return true
  const total = hand.reduce((acc, c) => acc + c.value, 0)
  return total >= requiredDamage
}

// === Win/Loss Conditions ===

/**
 * Check if the game is won (all 12 enemies defeated).
 */
export function isGameWon(castleDeck: EnemyCard[], currentEnemy: EnemyCard | null): boolean {
  return castleDeck.length === 0 && currentEnemy === null
}

/**
 * Check if the player has any valid plays available.
 * Returns true if the player has at least one card or jester to play.
 */
export function hasValidPlays(hand: Card[], jesters: JesterCard[]): boolean {
  return hand.length > 0 || jesters.length > 0
}

// === Yield ===

/**
 * A player can yield (pass) their turn. In solo mode this means
 * they skip to suffering damage directly. This is useful when
 * the player wants to discard cards strategically.
 *
 * In solo regicide, yielding is only allowed if the tavern deck is not empty
 * (to draw a card), OR if the player has no playable cards.
 */
export function canYield(tavernDeckSize: number, hand: Card[]): boolean {
  // Player can always yield if they have no cards
  if (hand.length === 0) return true
  // Otherwise, can yield to draw from tavern (must have cards in tavern)
  return tavernDeckSize > 0
}

// === Build PlayedCards ===

/**
 * Build the PlayedCards info from selected cards.
 */
export function buildPlayedCards(
  cards: Card[],
  jester: JesterCard | null,
  enemy: EnemyCard,
  immunityBroken: boolean
): PlayedCards {
  const { totalAttack, suits } = calculateAttack(cards, jester, enemy, immunityBroken)

  return {
    cards,
    jester,
    totalAttack,
    suits,
    isCombo: cards.length > 1,
  }
}
