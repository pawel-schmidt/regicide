import { describe, it, expect } from 'vitest'
import {
  isValidCombo,
  isValidAceCompanion,
  isValidPlay,
  calculateAttack,
  calculateHeartsHeal,
  calculateDiamondsDraw,
  calculateSpadesShield,
  isImmuneToSuit,
  getActiveSuits,
  applyDamage,
  isEnemyDefeated,
  isExactKill,
  getEffectiveAttack,
  isValidDamageDiscard,
  canSurviveAttack,
  isGameWon,
  canYield,
  buildPlayedCards,
} from './rules'
import type { Card, EnemyCard, JesterCard } from '../types'

// === Test Helpers ===

function makeCard(rank: Card['rank'], suit: Card['suit'] = 'hearts', value?: number): Card {
  const values: Record<string, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  }
  return { id: `test-${rank}-${suit}`, suit, rank, value: value ?? values[rank] }
}

function makeEnemy(
  suit: EnemyCard['suit'] = 'hearts',
  rank: EnemyCard['rank'] = 'J',
  health?: number
): EnemyCard {
  const stats: Record<string, { health: number; attack: number }> = {
    'J': { health: 20, attack: 10 },
    'Q': { health: 30, attack: 15 },
    'K': { health: 40, attack: 20 },
  }
  const s = stats[rank]
  return {
    id: `enemy-${rank}-${suit}`,
    suit, rank,
    maxHealth: s.health,
    health: health ?? s.health,
    baseAttack: s.attack,
    attack: s.attack,
  }
}

function makeJester(): JesterCard {
  return { id: 'jester-1', rank: 'Jester' }
}

// === Tests ===

describe('isValidCombo', () => {
  it('should accept a single card', () => {
    expect(isValidCombo([makeCard('5')])).toBe(true)
  })

  it('should accept two cards of same rank with sum <= 10', () => {
    expect(isValidCombo([makeCard('5', 'hearts'), makeCard('5', 'clubs')])).toBe(true)
  })

  it('should accept three 3s (sum = 9)', () => {
    expect(isValidCombo([
      makeCard('3', 'hearts'),
      makeCard('3', 'clubs'),
      makeCard('3', 'diamonds'),
    ])).toBe(true)
  })

  it('should reject two 6s (sum = 12 > 10)', () => {
    expect(isValidCombo([makeCard('6', 'hearts'), makeCard('6', 'clubs')])).toBe(false)
  })

  it('should reject cards of different ranks', () => {
    expect(isValidCombo([makeCard('3', 'hearts'), makeCard('5', 'clubs')])).toBe(false)
  })

  it('should reject empty array', () => {
    expect(isValidCombo([])).toBe(false)
  })

  it('should accept four 2s (sum = 8)', () => {
    expect(isValidCombo([
      makeCard('2', 'hearts'), makeCard('2', 'clubs'),
      makeCard('2', 'diamonds'), makeCard('2', 'spades'),
    ])).toBe(true)
  })

  it('should reject four 3s (sum = 12)', () => {
    expect(isValidCombo([
      makeCard('3', 'hearts'), makeCard('3', 'clubs'),
      makeCard('3', 'diamonds'), makeCard('3', 'spades'),
    ])).toBe(false)
  })
})

describe('isValidAceCompanion', () => {
  it('should accept one ace + one non-ace', () => {
    expect(isValidAceCompanion([makeCard('A', 'hearts'), makeCard('7', 'clubs')])).toBe(true)
  })

  it('should reject two non-aces', () => {
    expect(isValidAceCompanion([makeCard('5', 'hearts'), makeCard('7', 'clubs')])).toBe(false)
  })

  it('should reject a single ace', () => {
    expect(isValidAceCompanion([makeCard('A')])).toBe(false)
  })

  it('should reject three cards', () => {
    expect(isValidAceCompanion([
      makeCard('A', 'hearts'), makeCard('5', 'clubs'), makeCard('3', 'diamonds'),
    ])).toBe(false)
  })
})

describe('isValidPlay', () => {
  it('should accept jester alone', () => {
    expect(isValidPlay([], makeJester())).toBe(true)
  })

  it('should reject jester with cards', () => {
    expect(isValidPlay([makeCard('5')], makeJester())).toBe(false)
  })

  it('should accept a single card', () => {
    expect(isValidPlay([makeCard('8')], null)).toBe(true)
  })

  it('should accept a valid combo', () => {
    expect(isValidPlay([makeCard('5', 'hearts'), makeCard('5', 'clubs')], null)).toBe(true)
  })

  it('should accept ace companion', () => {
    expect(isValidPlay([makeCard('A', 'hearts'), makeCard('7', 'clubs')], null)).toBe(true)
  })

  it('should reject empty play without jester', () => {
    expect(isValidPlay([], null)).toBe(false)
  })
})

describe('calculateAttack', () => {
  it('should calculate simple attack value', () => {
    const result = calculateAttack([makeCard('7', 'hearts')], null, makeEnemy('diamonds'), false)
    expect(result.totalAttack).toBe(7)
    expect(result.suits).toEqual(['hearts'])
  })

  it('should double damage with clubs', () => {
    const result = calculateAttack([makeCard('5', 'clubs')], null, makeEnemy('hearts'), false)
    expect(result.totalAttack).toBe(10)
  })

  it('should NOT double when enemy is clubs (immune)', () => {
    const result = calculateAttack([makeCard('5', 'clubs')], null, makeEnemy('clubs'), false)
    expect(result.totalAttack).toBe(5)
  })

  it('should double when enemy is clubs but immunity is broken', () => {
    const result = calculateAttack([makeCard('5', 'clubs')], null, makeEnemy('clubs'), true)
    expect(result.totalAttack).toBe(10)
  })

  it('should sum combo values with clubs doubling', () => {
    const cards = [makeCard('3', 'clubs'), makeCard('3', 'hearts')]
    const result = calculateAttack(cards, null, makeEnemy('diamonds'), false)
    // Base = 6, clubs present so x2 = 12
    expect(result.totalAttack).toBe(12)
  })

  it('should return 0 for empty cards', () => {
    const result = calculateAttack([], null, makeEnemy(), false)
    expect(result.totalAttack).toBe(0)
  })
})

describe('suit power calculations', () => {
  it('hearts heal equals base attack value', () => {
    expect(calculateHeartsHeal([makeCard('7')])).toBe(7)
    expect(calculateHeartsHeal([makeCard('3'), makeCard('3')])).toBe(6)
  })

  it('diamonds draw equals base attack value', () => {
    expect(calculateDiamondsDraw([makeCard('5')])).toBe(5)
  })

  it('spades shield equals base attack value', () => {
    expect(calculateSpadesShield([makeCard('8')])).toBe(8)
  })
})

describe('immunity', () => {
  it('enemy is immune to own suit', () => {
    expect(isImmuneToSuit(makeEnemy('hearts'), 'hearts', false)).toBe(true)
  })

  it('enemy is not immune to other suits', () => {
    expect(isImmuneToSuit(makeEnemy('hearts'), 'clubs', false)).toBe(false)
  })

  it('immunity is broken by jester', () => {
    expect(isImmuneToSuit(makeEnemy('hearts'), 'hearts', true)).toBe(false)
  })

  it('getActiveSuits filters immune suit', () => {
    const suits = getActiveSuits(['hearts', 'clubs'], makeEnemy('hearts'), false)
    expect(suits).toEqual(['clubs'])
  })

  it('getActiveSuits keeps all when immunity broken', () => {
    const suits = getActiveSuits(['hearts', 'clubs'], makeEnemy('hearts'), true)
    expect(suits).toEqual(['hearts', 'clubs'])
  })
})

describe('damage resolution', () => {
  it('should subtract damage from health', () => {
    const enemy = applyDamage(makeEnemy('hearts', 'J'), 7)
    expect(enemy.health).toBe(13)
  })

  it('should detect defeated enemy', () => {
    const enemy = applyDamage(makeEnemy('hearts', 'J'), 25)
    expect(isEnemyDefeated(enemy)).toBe(true)
  })

  it('should detect exact kill', () => {
    const enemy = applyDamage(makeEnemy('hearts', 'J'), 20)
    expect(isExactKill(enemy)).toBe(true)
    expect(isEnemyDefeated(enemy)).toBe(true)
  })

  it('should detect surviving enemy', () => {
    const enemy = applyDamage(makeEnemy('hearts', 'J'), 5)
    expect(isEnemyDefeated(enemy)).toBe(false)
    expect(isExactKill(enemy)).toBe(false)
  })
})

describe('suffer damage', () => {
  it('should calculate effective attack with shield', () => {
    const enemy = makeEnemy('hearts', 'J') // attack 10
    expect(getEffectiveAttack(enemy, 3)).toBe(7)
  })

  it('should not go below 0', () => {
    const enemy = makeEnemy('hearts', 'J') // attack 10
    expect(getEffectiveAttack(enemy, 15)).toBe(0)
  })

  it('should validate damage discard', () => {
    const cards = [makeCard('5'), makeCard('6')]
    expect(isValidDamageDiscard(cards, 10)).toBe(true)
    expect(isValidDamageDiscard(cards, 11)).toBe(true)
    expect(isValidDamageDiscard(cards, 12)).toBe(false)
  })

  it('should accept empty discard when damage is 0', () => {
    expect(isValidDamageDiscard([], 0)).toBe(true)
  })

  it('should check if player can survive', () => {
    const hand = [makeCard('5'), makeCard('6'), makeCard('3')]
    expect(canSurviveAttack(hand, 14)).toBe(true)
    expect(canSurviveAttack(hand, 15)).toBe(false)
  })
})

describe('win/loss conditions', () => {
  it('game is won when no enemies remain', () => {
    expect(isGameWon([], null)).toBe(true)
  })

  it('game is not won with enemies in castle deck', () => {
    expect(isGameWon([makeEnemy()], null)).toBe(false)
  })

  it('game is not won with current enemy', () => {
    expect(isGameWon([], makeEnemy())).toBe(false)
  })
})

describe('canYield', () => {
  it('can yield with tavern cards remaining', () => {
    expect(canYield(10, [makeCard('5')])).toBe(true)
  })

  it('cannot yield with empty tavern and cards in hand', () => {
    expect(canYield(0, [makeCard('5')])).toBe(false)
  })

  it('can yield with empty hand regardless of tavern', () => {
    expect(canYield(0, [])).toBe(true)
  })
})

describe('buildPlayedCards', () => {
  it('should build correct play info', () => {
    const cards = [makeCard('7', 'clubs')]
    const enemy = makeEnemy('hearts')
    const result = buildPlayedCards(cards, null, enemy, false)

    expect(result.cards).toEqual(cards)
    expect(result.jester).toBeNull()
    expect(result.totalAttack).toBe(14) // 7 * 2 (clubs)
    expect(result.suits).toEqual(['clubs'])
    expect(result.isCombo).toBe(false)
  })

  it('should mark combos correctly', () => {
    const cards = [makeCard('5', 'hearts'), makeCard('5', 'clubs')]
    const enemy = makeEnemy('diamonds')
    const result = buildPlayedCards(cards, null, enemy, false)

    expect(result.isCombo).toBe(true)
    expect(result.totalAttack).toBe(20) // (5+5) * 2 (clubs)
    expect(result.suits).toContain('hearts')
    expect(result.suits).toContain('clubs')
  })
})
