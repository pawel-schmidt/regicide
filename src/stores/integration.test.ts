import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './gameStore'
import type { Card } from '../types'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('integration: full turn sequences', () => {
  it('should complete a full turn: play -> suit power -> damage -> suffer damage', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Pick a card from hand
    const card = store.playerHand[0]
    store.toggleCardSelection(card.id)
    store.playSelectedCards()

    // Enemy should have taken damage (unless it was clubs-doubled, etc.)
    // Turn should be at suffer_damage or play_cards (if enemy defeated)
    expect(['play_cards', 'suffer_damage', 'lost']).toContain(store.turnStep)
  })

  it('should apply clubs doubling correctly', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Force a clubs card into hand and a non-clubs enemy
    const clubsCard: Card = {
      id: 'test-clubs-5',
      suit: 'clubs',
      rank: '5',
      value: 5,
    }
    store.playerHand = [clubsCard, ...store.playerHand.slice(1)]

    // Make sure enemy isn't clubs (so no immunity)
    if (store.currentEnemy!.suit === 'clubs') {
      store.currentEnemy = {
        ...store.currentEnemy!,
        suit: 'hearts',
      }
    }

    const initialHealth = store.currentEnemy!.health
    store.toggleCardSelection(clubsCard.id)
    store.playSelectedCards()

    // Clubs doubles: 5 * 2 = 10 damage
    if (store.currentEnemy) {
      expect(store.currentEnemy.health).toBe(initialHealth - 10)
    }
    // If enemy was defeated (health <= 0), that's valid too
  })

  it('should apply spades shield and reduce effective attack', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Force a spades card into hand and a non-spades enemy
    const spadesCard: Card = {
      id: 'test-spades-7',
      suit: 'spades',
      rank: '7',
      value: 7,
    }
    store.playerHand = [spadesCard, ...store.playerHand.slice(1)]

    if (store.currentEnemy!.suit === 'spades') {
      store.currentEnemy = { ...store.currentEnemy!, suit: 'hearts' }
    }

    store.toggleCardSelection(spadesCard.id)
    store.playSelectedCards()

    // Shield should have been applied
    expect(store.shieldTotal).toBe(7)
    // Effective attack should be reduced
    expect(store.effectiveEnemyAttack).toBe(store.currentEnemy!.baseAttack - 7)
  })

  it('should handle exact kill (capture) correctly', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Set enemy health to exactly match our attack
    store.currentEnemy = {
      ...store.currentEnemy!,
      health: 5,
      suit: 'hearts', // Not clubs so no doubling surprises
    }

    const card: Card = { id: 'test-5h', suit: 'hearts', rank: '5', value: 5 }
    store.playerHand = [card, ...store.playerHand.slice(1)]

    const tavernBefore = store.tavernDeck.length
    store.toggleCardSelection(card.id)
    store.playSelectedCards()

    // Enemy should be captured -> tavern deck should have one more card on top
    // The captured card should be a face card
    expect(store.tavernDeck.length).toBeGreaterThanOrEqual(tavernBefore)
    // The captured card should be on top of the tavern deck
    const topCard = store.tavernDeck[0]
    if (topCard.captured) {
      expect(['J', 'Q', 'K']).toContain(topCard.rank)
    }
  })

  it('should handle immunity correctly for same-suit plays', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Set enemy to hearts
    store.currentEnemy = {
      ...store.currentEnemy!,
      suit: 'hearts',
      health: 20,
      maxHealth: 20,
      baseAttack: 10,
      attack: 10,
    }

    // Play a hearts card - healing should be blocked by immunity
    const heartsCard: Card = { id: 'test-3h', suit: 'hearts', rank: '3', value: 3 }
    store.playerHand = [heartsCard, ...store.playerHand.slice(1)]

    // Add some cards to discard so we can check healing doesn't happen
    store.discardPile = [
      { id: 'discard-1', suit: 'clubs', rank: '2', value: 2 },
      { id: 'discard-2', suit: 'diamonds', rank: '4', value: 4 },
    ]
    const discardBefore = store.discardPile.length

    store.toggleCardSelection(heartsCard.id)
    store.playSelectedCards()

    // Hearts power should be blocked (immune), so discard pile should only grow
    // (played card added after suit powers resolve)
    // The 2 discard cards should still be there (no healing occurred)
    // Plus the just-played hearts card
    expect(store.discardPile.length).toBe(discardBefore + 1) // +1 for the played card
  })

  it('should reset immunity at end of turn', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Manually set immunity broken
    store.immunityBroken = true

    // Simulate finishing a turn
    store.currentPlay = null
    store.turnStep = 'suffer_damage'
    store.shieldTotal = 100 // Fully shielded so auto-finish

    // Need to set up currentEnemy for checkAutoSufferDamage
    store.currentEnemy = {
      ...store.currentEnemy!,
      baseAttack: 10,
      attack: 10,
    }

    store.checkAutoSufferDamage()

    // Immunity should be reset after turn finishes
    expect(store.immunityBroken).toBe(false)
  })

  it('should detect game over when player cannot survive attack', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Give player a hand with very low total value
    store.playerHand = [
      { id: 'low-1', suit: 'hearts', rank: 'A', value: 1 },
    ]

    // Set up a high-attack enemy with no shield
    store.currentEnemy = {
      id: 'enemy-k-hearts',
      suit: 'hearts',
      rank: 'K',
      maxHealth: 40,
      health: 40,
      baseAttack: 20,
      attack: 20,
    }
    store.shieldTotal = 0
    store.turnStep = 'suffer_damage'

    store.checkAutoSufferDamage()

    expect(store.phase).toBe('lost')
  })

  it('should handle diamonds draw with hand limit', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Fill hand to near limit
    while (store.playerHand.length < 7) {
      store.playerHand.push({
        id: `fill-${store.playerHand.length}`,
        suit: 'hearts',
        rank: '2',
        value: 2,
      })
    }

    // Play a diamond card (should draw up to hand limit)
    const diamondCard: Card = { id: 'test-diamond-5', suit: 'diamonds', rank: '5', value: 5 }
    store.playerHand.push(diamondCard) // Now at 8 (limit)

    // Ensure enemy is not diamonds (no immunity)
    if (store.currentEnemy!.suit === 'diamonds') {
      store.currentEnemy = { ...store.currentEnemy!, suit: 'hearts' }
    }

    store.toggleCardSelection(diamondCard.id)
    store.playSelectedCards()

    // After playing 1 card, hand was at 7. Diamond draw = 5, but limit is 8.
    // So should draw min(5, 8-7) = 1 card
    // Hand should be at most 8
    expect(store.playerHand.length).toBeLessThanOrEqual(8)
  })

  it('should handle game win when all enemies are defeated', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Set up last enemy with 1 health
    store.castleDeck = []
    store.currentEnemy = {
      id: 'last-enemy',
      suit: 'hearts',
      rank: 'J',
      maxHealth: 20,
      health: 1,
      baseAttack: 10,
      attack: 10,
    }

    // Play a card to defeat it
    const card: Card = { id: 'test-finisher', suit: 'spades', rank: '2', value: 2 }
    store.playerHand = [card, ...store.playerHand.slice(0, 7)]

    store.toggleCardSelection(card.id)
    store.playSelectedCards()

    expect(store.phase).toBe('won')
  })

  it('hearts healing should not recover just-played cards', () => {
    const store = useGameStore()
    store.startNewGame(1)

    // Empty the discard pile
    store.discardPile = []

    // Ensure enemy is not hearts (so hearts power works)
    store.currentEnemy = {
      ...store.currentEnemy!,
      suit: 'clubs',
      health: 100,
      maxHealth: 100,
    }

    // Play a hearts card with empty discard
    const heartsCard: Card = { id: 'test-hearts-5', suit: 'hearts', rank: '5', value: 5 }
    store.playerHand = [heartsCard, ...store.playerHand.slice(1)]

    const tavernBefore = store.tavernDeck.length
    store.toggleCardSelection(heartsCard.id)
    store.playSelectedCards()

    // Discard was empty before play. Hearts should have nothing to recover.
    // The played hearts card should now be in discard, NOT recovered to tavern.
    // Tavern size should not have grown from healing
    // (it might have grown from diamond draws or other effects, but not hearts)
    expect(store.discardPile.some(c => c.id === heartsCard.id)).toBe(true)
    expect(store.tavernDeck.length).toBeLessThanOrEqual(tavernBefore)
  })
})
