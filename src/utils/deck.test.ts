import { describe, it, expect, beforeEach } from 'vitest'
import {
  shuffle,
  createTavernDeck,
  createJesters,
  createCastleDeck,
  createEnemyCard,
  dealCards,
  drawCards,
  resetCardIdCounter,
} from './deck'

beforeEach(() => {
  resetCardIdCounter()
})

describe('shuffle', () => {
  it('should return the same array reference', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result).toBe(arr)
  })

  it('should contain the same elements after shuffling', () => {
    const arr = [1, 2, 3, 4, 5]
    const copy = [...arr]
    shuffle(arr)
    expect(arr.sort()).toEqual(copy.sort())
  })

  it('should handle empty array', () => {
    expect(shuffle([])).toEqual([])
  })

  it('should handle single element', () => {
    expect(shuffle([42])).toEqual([42])
  })
})

describe('createTavernDeck', () => {
  it('should create 40 cards (A-10 of 4 suits)', () => {
    const deck = createTavernDeck()
    expect(deck).toHaveLength(40)
  })

  it('should have 10 cards per suit', () => {
    const deck = createTavernDeck()
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
    for (const suit of suits) {
      const suitCards = deck.filter(c => c.suit === suit)
      expect(suitCards).toHaveLength(10)
    }
  })

  it('should have correct values for each rank', () => {
    const deck = createTavernDeck()
    const aces = deck.filter(c => c.rank === 'A')
    expect(aces).toHaveLength(4)
    aces.forEach(a => expect(a.value).toBe(1))

    const tens = deck.filter(c => c.rank === '10')
    expect(tens).toHaveLength(4)
    tens.forEach(t => expect(t.value).toBe(10))
  })

  it('should have unique IDs for all cards', () => {
    const deck = createTavernDeck()
    const ids = deck.map(c => c.id)
    expect(new Set(ids).size).toBe(40)
  })
})

describe('createJesters', () => {
  it('should create 0 jesters for 1 player', () => {
    expect(createJesters(1)).toHaveLength(0)
  })

  it('should create 0 jesters for 2 players', () => {
    expect(createJesters(2)).toHaveLength(0)
  })

  it('should create 1 jester for 3 players', () => {
    expect(createJesters(3)).toHaveLength(1)
  })

  it('should create 2 jesters for 4 players', () => {
    expect(createJesters(4)).toHaveLength(2)
  })
})

describe('createEnemyCard', () => {
  it('should create a Jack with correct stats', () => {
    const jack = createEnemyCard('hearts', 'J')
    expect(jack.suit).toBe('hearts')
    expect(jack.rank).toBe('J')
    expect(jack.maxHealth).toBe(20)
    expect(jack.health).toBe(20)
    expect(jack.baseAttack).toBe(10)
    expect(jack.attack).toBe(10)
  })

  it('should create a Queen with correct stats', () => {
    const queen = createEnemyCard('diamonds', 'Q')
    expect(queen.maxHealth).toBe(30)
    expect(queen.baseAttack).toBe(15)
  })

  it('should create a King with correct stats', () => {
    const king = createEnemyCard('spades', 'K')
    expect(king.maxHealth).toBe(40)
    expect(king.baseAttack).toBe(20)
  })
})

describe('createCastleDeck', () => {
  it('should create 12 enemy cards', () => {
    const deck = createCastleDeck()
    expect(deck).toHaveLength(12)
  })

  it('should have Jacks on top (indices 0-3)', () => {
    const deck = createCastleDeck()
    for (let i = 0; i < 4; i++) {
      expect(deck[i].rank).toBe('J')
    }
  })

  it('should have Queens in the middle (indices 4-7)', () => {
    const deck = createCastleDeck()
    for (let i = 4; i < 8; i++) {
      expect(deck[i].rank).toBe('Q')
    }
  })

  it('should have Kings at the bottom (indices 8-11)', () => {
    const deck = createCastleDeck()
    for (let i = 8; i < 12; i++) {
      expect(deck[i].rank).toBe('K')
    }
  })

  it('should have all 4 suits for each rank', () => {
    const deck = createCastleDeck()
    const jacks = deck.slice(0, 4).map(c => c.suit).sort()
    const queens = deck.slice(4, 8).map(c => c.suit).sort()
    const kings = deck.slice(8, 12).map(c => c.suit).sort()

    const allSuits = ['clubs', 'diamonds', 'hearts', 'spades']
    expect(jacks).toEqual(allSuits)
    expect(queens).toEqual(allSuits)
    expect(kings).toEqual(allSuits)
  })
})

describe('dealCards', () => {
  it('should deal the correct number of cards', () => {
    const deck = createTavernDeck()
    const [dealt, remaining] = dealCards(deck, 8)
    expect(dealt).toHaveLength(8)
    expect(remaining).toHaveLength(32)
  })

  it('should deal from the top of the deck', () => {
    const deck = createTavernDeck()
    const topCards = deck.slice(0, 3)
    const [dealt] = dealCards(deck, 3)
    expect(dealt).toEqual(topCards)
  })

  it('should not mutate the original deck', () => {
    const deck = createTavernDeck()
    const originalLength = deck.length
    dealCards(deck, 5)
    expect(deck).toHaveLength(originalLength)
  })
})

describe('drawCards', () => {
  it('should draw up to the available cards', () => {
    const deck = createTavernDeck()
    const small = deck.slice(0, 3)
    const [drawn, remaining] = drawCards(small, 5)
    expect(drawn).toHaveLength(3)
    expect(remaining).toHaveLength(0)
  })

  it('should draw the exact amount if enough cards', () => {
    const deck = createTavernDeck()
    const [drawn, remaining] = drawCards(deck, 5)
    expect(drawn).toHaveLength(5)
    expect(remaining).toHaveLength(35)
  })
})
